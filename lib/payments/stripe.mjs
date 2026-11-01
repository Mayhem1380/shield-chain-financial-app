import { createHmac, timingSafeEqual } from 'node:crypto';

export class PaymentError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

// One merchant account, AUD, hosted card checkout. No custody, deposits or trading funding.
export function paymentConfiguration(env = process.env, { existingBilling = false } = {}) {
  const mode = env.PAYMENTS_MODE;
  if (!['test', 'live'].includes(mode)) throw new PaymentError('PAYMENTS_NOT_CONFIGURED', 503);
  const prefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
  if (!env.STRIPE_SECRET_KEY?.startsWith(prefix) || !env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) throw new PaymentError('PAYMENT_CREDENTIALS_MISSING_OR_WRONG_MODE', 503);
  const origin = new URL(env.PAYMENTS_ORIGIN || 'https://invalid.local');
  if (origin.protocol !== 'https:' || origin.origin !== env.PAYMENTS_ORIGIN || origin.hostname === 'invalid.local') throw new PaymentError('PAYMENT_ORIGIN_INVALID', 503);
  if (mode === 'live' && !existingBilling && (env.PAYMENTS_LIVE_ENABLED !== 'true' || !env.PAYMENTS_APPROVAL_REFERENCE || !env.PAYMENTS_SECURITY_REVIEW_REFERENCE)) throw new PaymentError('LIVE_PAYMENT_APPROVALS_REQUIRED', 503);
  return { mode, live: mode === 'live', key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, origin: origin.origin };
}

export function verifyStripeEvent(raw, signature, config, now = Date.now()) {
  if (!Buffer.isBuffer(raw) || raw.length > 262144 || typeof signature !== 'string' || signature.length > 4096) throw new PaymentError('INVALID_WEBHOOK', 400);
  const parts = signature.split(',').map(p => p.split('='));
  const timestamps = parts.filter(([k]) => k === 't').map(([,v]) => v);
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0])) throw new PaymentError('INVALID_SIGNATURE', 400);
  const timestamp = Number(timestamps[0]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 300) throw new PaymentError('SIGNATURE_EXPIRED', 400);
  const expected = createHmac('sha256', config.webhookSecret).update(`${timestamp}.`).update(raw).digest();
  const valid = parts.filter(([k,v]) => k === 'v1' && /^[a-f0-9]{64}$/.test(v || '')).some(([,v]) => timingSafeEqual(Buffer.from(v, 'hex'), expected));
  if (!valid) throw new PaymentError('INVALID_SIGNATURE', 400);
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { throw new PaymentError('INVALID_WEBHOOK_JSON'); }
  if (!/^evt_[A-Za-z0-9]+$/.test(event.id || '') || event.object !== 'event' || event.livemode !== config.live || event.account || !event.data?.object) throw new PaymentError('WEBHOOK_ACCOUNT_OR_MODE_MISMATCH');
  return event;
}

export function stripeClient(config, transport = fetch) {
  async function request(method, path, fields, key) {
    if (!path.startsWith('/v1/') || path.includes('..')) throw new PaymentError('INVALID_PROVIDER_PATH');
    const response = await transport(`https://api.stripe.com${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${config.key}`, 'Stripe-Version': '2026-10-28.endive', ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': key } : {}) },
      ...(method === 'POST' ? { body: new URLSearchParams(fields).toString() } : {}),
    });
    if (!response.ok) throw new PaymentError('PAYMENT_PROVIDER_REQUEST_FAILED', 502);
    const result = await response.json();
    if (result.livemode !== undefined && result.livemode !== config.live) throw new PaymentError('PROVIDER_MODE_MISMATCH', 502);
    return result;
  }
  return {
    createCheckout: (order, email) => request('POST', '/v1/checkout/sessions', {
      mode: 'payment', 'payment_method_types[0]': 'card', customer_creation: 'always', customer_email: email,
      client_reference_id: order.id, 'metadata[orderId]': order.id,
      'payment_intent_data[metadata][orderId]': order.id,
      'payment_intent_data[receipt_email]': email,
      'payment_method_options[card][request_three_d_secure]': 'any',
      'line_items[0][price]': order.priceId, 'line_items[0][quantity]': '1',
      success_url: `${config.origin}/billing?order=${encodeURIComponent(order.id)}`,
      cancel_url: `${config.origin}/billing?order=${encodeURIComponent(order.id)}`,
    }, `sf-checkout-${order.id}`),
    checkout: id => {
      if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_CHECKOUT_ID');
      return request('GET', `/v1/checkout/sessions/${id}?expand[]=payment_intent.latest_charge`);
    },
    price: id => {
      if (!/^price_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_PRICE_ID');
      return request('GET', `/v1/prices/${id}`);
    },
    refund: order => request('POST', '/v1/refunds', { payment_intent: order.paymentIntentId, amount: String(order.amountMinor), 'metadata[orderId]': order.id }, `sf-full-refund-${order.id}`),
    refundById: id => {
      if (!/^re_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_REFUND_ID');
      return request('GET', `/v1/refunds/${id}`);
    },
    createCustomer: (account, email) => request('POST', '/v1/customers', { email, 'metadata[billingAccountId]': account.id }, `sf-customer-${account.id}`),
    createSubscriptionCheckout: (record, customerId) => request('POST', '/v1/checkout/sessions', {
      mode: 'subscription', customer: customerId,
      'payment_method_types[0]': 'card', 'payment_method_options[card][request_three_d_secure]': 'any',
      'line_items[0][price]': record.priceId, 'line_items[0][quantity]': '1',
      client_reference_id: record.id, 'metadata[premiumSubscriptionId]': record.id,
      'subscription_data[metadata][premiumSubscriptionId]': record.id,
      'consent_collection[terms_of_service]': 'required',
      success_url: `${config.origin}/billing?subscription=${encodeURIComponent(record.id)}`,
      cancel_url: `${config.origin}/billing?subscription=${encodeURIComponent(record.id)}`,
    }, `sf-subscription-checkout-${record.id}`),
    subscription: id => {
      if (!/^sub_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_SUBSCRIPTION_ID');
      return request('GET', `/v1/subscriptions/${id}`);
    },
    cancelSubscriptionAtPeriodEnd: id => {
      if (!/^sub_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_SUBSCRIPTION_ID');
      return request('POST', `/v1/subscriptions/${id}`, { cancel_at_period_end: 'true', proration_behavior: 'none' }, `sf-cancel-at-period-end-${id}`);
    },
    invoice: id => {
      if (!/^in_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_INVOICE_ID');
      return request('GET', `/v1/invoices/${id}`);
    },
    invoicePayments: id => {
      if (!/^in_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_INVOICE_ID');
      return request('GET', `/v1/invoice_payments?invoice=${id}&limit=100`);
    },
    paymentIntent: id => {
      if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new PaymentError('INVALID_PAYMENT_INTENT_ID');
      return request('GET', `/v1/payment_intents/${id}?expand[]=latest_charge`);
    },
    portal: (customerId, key) => {
      if (!process.env.STRIPE_PORTAL_CONFIGURATION_ID?.match(/^bpc_[A-Za-z0-9]+$/)) throw new PaymentError('BILLING_PORTAL_NOT_CONFIGURED', 503);
      return request('POST', '/v1/billing_portal/sessions', { customer: customerId, configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID, return_url: `${config.origin}/billing` }, key);
    },
    portalConfiguration: () => {
      const portalId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
      if (!/^bpc_[A-Za-z0-9]+$/.test(portalId || '')) throw new PaymentError('BILLING_PORTAL_NOT_CONFIGURED', 503);
      return request('GET', `/v1/billing_portal/configurations/${portalId}`);
    },
    refundInvoice: invoice => request('POST', '/v1/refunds', { payment_intent: invoice.paymentIntentId, amount: String(invoice.amountMinor), 'metadata[billingInvoiceId]': invoice.id }, `sf-invoice-refund-${invoice.id}`),
  };
}

export function paymentSnapshot(order, session, live) {
  if (session.object !== 'checkout.session' || session.id !== order.checkoutSessionId || session.livemode !== live || session.client_reference_id !== order.id || session.metadata?.orderId !== order.id || session.currency !== order.currency || session.amount_total !== order.amountMinor) throw new PaymentError('PAYMENT_RECONCILIATION_MISMATCH', 409);
  const pi = session.payment_intent;
  if (session.payment_status !== 'paid') return { paid: false, expired: session.status === 'expired' };
  const charge = pi?.latest_charge;
  if (pi?.status !== 'succeeded' || pi.currency !== order.currency || pi.amount_received !== order.amountMinor || pi.livemode !== live || pi.metadata?.orderId !== order.id || !charge || charge.currency !== order.currency || charge.amount !== order.amountMinor || charge.paid !== true || charge.captured !== true || charge.livemode !== live || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0 || charge.amount_refunded > order.amountMinor) throw new PaymentError('PAYMENT_CONFIRMATION_MISMATCH', 409);
  let receiptUrl = null;
  if (charge.receipt_url) {
    const url = new URL(charge.receipt_url);
    if (url.protocol === 'https:' && url.hostname === 'pay.stripe.com') receiptUrl = url.href;
  }
  return { paid: true, paymentIntentId: pi.id, customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id, refundedMinor: charge.amount_refunded, riskHold: charge.disputed === true || charge.outcome?.risk_level === 'highest' || charge.outcome?.type === 'manual_review', receiptUrl };
}
