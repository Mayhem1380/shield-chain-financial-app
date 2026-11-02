import { PaymentError } from './stripe.mjs';
import { PREMIUM_OFFER, matchesPremiumProposal } from '../premium-offer.mjs';

export const PREMIUM_PRODUCT_CODE = 'SF_PREMIUM_SOFTWARE_ACCESS';
export const PREMIUM_TITLE = 'ShieldChain Financial Premium Software Access';
export const PREMIUM_FEATURES = Object.freeze(['enhanced-calculators', 'educational-analytics', 'premium-dashboard']);
const id = value => typeof value === 'string' ? value : value?.id;
export const providerId = id;

export function approvedPremiumProduct(product, live, now = Date.now()) {
  if (!matchesPremiumProposal(product) || product?.termsVersion !== PREMIUM_OFFER.termsVersion) throw new PaymentError('PREMIUM_PROPOSED_PRICE_OR_TERMS_MISMATCH', 403);
  if (live && (PREMIUM_OFFER.pricingStatus !== 'APPROVED' || !PREMIUM_OFFER.ownerPricingApprovalReference || product.pricingApprovalReference !== PREMIUM_OFFER.ownerPricingApprovalReference)) throw new PaymentError('FINAL_PREMIUM_PRICING_APPROVAL_REQUIRED', 403);
  if (live && (PREMIUM_OFFER.activationStatus !== 'AUTHORISED' || !PREMIUM_OFFER.ownerActivationReference)) throw new PaymentError('SEPARATE_LIVE_ACTIVATION_AUTHORISATION_REQUIRED', 403);
  const expiry = new Date(product?.approvedUntil || 0).getTime();
  if (!product || product.code !== PREMIUM_PRODUCT_CODE || product.title !== PREMIUM_TITLE || product.purpose !== 'SOFTWARE_ACCESS' || product.billingMode !== 'SUBSCRIPTION' || product.currency !== 'aud' || product.live !== live || !product.enabled || !product.providerApprovalReference || !product.legalApprovalReference || !product.termsVersion || !Number.isFinite(expiry) || expiry <= now || !Number.isSafeInteger(product.amountMinor) || product.amountMinor < 50 || product.amountMinor > 100000 || !['month', 'year'].includes(product.interval) || !Number.isSafeInteger(product.intervalCount) || product.intervalCount < 1 || product.intervalCount > 12) throw new PaymentError('PREMIUM_PRODUCT_NOT_CONFIGURED_OR_APPROVED', 403);
  return product;
}

export function requirePremiumConsent(consent) {
  if (consent?.accepted !== true || consent?.termsVersion !== PREMIUM_OFFER.termsVersion) throw new PaymentError('PREMIUM_SUBSCRIPTION_TERMS_ACCEPTANCE_REQUIRED', 400);
}

export function assertRecurringPrice(record, price) {
  if (price.id !== record.priceId || price.type !== 'recurring' || price.livemode !== record.live || price.currency !== record.currency || price.unit_amount !== record.amountMinor || price.billing_scheme !== 'per_unit' || price.custom_unit_amount || price.transform_quantity || price.recurring?.usage_type !== 'licensed' || price.recurring.interval !== record.interval || price.recurring.interval_count !== record.intervalCount) throw new PaymentError('PREMIUM_PRICE_MISMATCH', 409);
}

export function checkedSubscription(record, subscription, customerId) {
  if (subscription.object !== 'subscription' || subscription.id !== record.providerSubscriptionId || subscription.livemode !== record.live || id(subscription.customer) !== customerId || subscription.metadata?.premiumSubscriptionId !== record.id || subscription.currency !== record.currency || subscription.items?.has_more || subscription.items?.data?.length !== 1 || subscription.collection_method !== 'charge_automatically') throw new PaymentError('SUBSCRIPTION_RECONCILIATION_MISMATCH', 409);
  const item = subscription.items.data[0];
  assertRecurringPrice(record, item.price);
  if (item.quantity !== 1 || !Number.isSafeInteger(item.current_period_start) || !Number.isSafeInteger(item.current_period_end) || item.current_period_end <= item.current_period_start) throw new PaymentError('SUBSCRIPTION_PERIOD_MISMATCH', 409);
  if (record.providerStatus === 'canceled' && subscription.status !== 'canceled') throw new PaymentError('SUBSCRIPTION_TERMINAL_STATE_CHANGED', 409);
  return item;
}

export function stripeLink(value, host) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function invoiceSnapshot(record, invoice, payments, intent, customerId) {
  const line = invoice.lines?.data?.[0];
  if (invoice.object !== 'invoice' || invoice.livemode !== record.live || id(invoice.customer) !== customerId || id(invoice.parent?.subscription_details?.subscription) !== record.providerSubscriptionId || invoice.currency !== record.currency || invoice.total !== record.amountMinor || invoice.lines?.has_more || invoice.lines?.data?.length !== 1 || id(line.pricing?.price_details?.price) !== record.priceId || line.quantity !== 1 || !Number.isSafeInteger(line.period?.start) || !Number.isSafeInteger(line.period?.end) || line.period.end <= line.period.start) throw new PaymentError('PREMIUM_INVOICE_MISMATCH', 409);
  const common = { providerInvoiceId: invoice.id, amountMinor: invoice.total, currency: invoice.currency, status: invoice.status || 'unknown', periodStart: new Date(line.period.start * 1000), periodEnd: new Date(line.period.end * 1000), hostedInvoiceUrl: stripeLink(invoice.hosted_invoice_url, 'invoice.stripe.com'), paymentIntentId: null, refundedMinor: 0, riskHold: false, receiptUrl: null, paidAt: null };
  if (invoice.status !== 'paid') return common;
  const paid = payments?.data?.filter(p => p.status === 'paid');
  const payment = paid?.[0];
  const charge = intent?.latest_charge;
  if (invoice.amount_paid !== record.amountMinor || invoice.amount_remaining !== 0 || payments?.has_more || paid?.length !== 1 || payment.invoice !== invoice.id || payment.livemode !== record.live || payment.currency !== record.currency || payment.amount_paid !== record.amountMinor || payment.payment?.type !== 'payment_intent' || id(payment.payment.payment_intent) !== intent?.id || intent?.object !== 'payment_intent' || intent.status !== 'succeeded' || intent.livemode !== record.live || intent.currency !== record.currency || intent.amount_received !== record.amountMinor || id(intent.customer) !== customerId || !charge || id(charge.customer) !== customerId || charge.livemode !== record.live || charge.currency !== record.currency || charge.amount !== record.amountMinor || charge.paid !== true || charge.captured !== true || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0 || charge.amount_refunded > record.amountMinor) throw new PaymentError('PREMIUM_INVOICE_PAYMENT_MISMATCH', 409);
  return { ...common, paymentIntentId: intent.id, refundedMinor: charge.amount_refunded, riskHold: charge.disputed === true || charge.outcome?.risk_level === 'highest' || charge.outcome?.type === 'manual_review', receiptUrl: stripeLink(charge.receipt_url, 'pay.stripe.com'), paidAt: Number.isSafeInteger(payment.status_transitions?.paid_at) ? new Date(payment.status_transitions.paid_at * 1000) : null };
}

export function premiumAccess(record, invoice, now = Date.now(), expectedLive = true) {
  const deny = { allowed: false, features: [], accessUntil: null };
  const dates = [record?.lastReconciledAt, record?.accessUntil, invoice?.periodStart, invoice?.periodEnd].map(value => value ? new Date(value).getTime() : NaN);
  if (!Number.isFinite(now) || dates.some(value => !Number.isFinite(value))) return deny;
  if (invoice?.subscriptionId && invoice.subscriptionId !== record?.id || invoice?.amountMinor !== record?.amountMinor || invoice?.currency !== record?.currency) return deny;
  if (!record || record.live !== expectedLive || record.productCode !== PREMIUM_PRODUCT_CODE || record.providerStatus !== 'active' || record.riskHold || !record.lastReconciledAt || new Date(record.lastReconciledAt).getTime() > now || now - new Date(record.lastReconciledAt).getTime() > 15 * 60000 || !record.accessUntil || new Date(record.accessUntil).getTime() <= now || !invoice || invoice.providerInvoiceId !== record.currentInvoiceId || invoice.status !== 'paid' || !invoice.paymentIntentId || invoice.refundedMinor !== 0 || invoice.riskHold || !invoice.periodStart || new Date(invoice.periodStart).getTime() > now || !invoice.periodEnd || new Date(invoice.periodEnd).getTime() < new Date(record.accessUntil).getTime()) return deny;
  return { allowed: true, features: [...PREMIUM_FEATURES], accessUntil: new Date(record.accessUntil).toISOString() };
}

export function calculatePremiumRisk(input) {
  const { amount, downsidePercent, feePercent } = input;
  if (![amount, downsidePercent, feePercent].every(Number.isFinite) || amount <= 0 || amount > 100000000 || downsidePercent < 0 || downsidePercent > 100 || feePercent < 0 || feePercent > 100) throw new PaymentError('CALCULATOR_INPUT_INVALID');
  const fee = amount * feePercent / 100;
  const marketLoss = amount * downsidePercent / 100;
  return { amount, fee, marketLoss, remaining: Math.max(0, amount - fee - marketLoss), hypothetical: true, liveMarketData: false };
}
