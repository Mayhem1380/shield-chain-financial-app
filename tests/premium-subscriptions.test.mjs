import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_PRODUCT_CODE, PREMIUM_TITLE, approvedPremiumProduct, requirePremiumConsent, assertRecurringPrice, checkedSubscription, invoiceSnapshot, premiumAccess, calculatePremiumRisk } from '../lib/payments/premium-policy.mjs';
import { syncPremiumSubscription, createPremiumCheckout, cancelPremiumRecord } from '../lib/payments/premium-runtime.mjs';
import { PREMIUM_OFFER } from '../lib/premium-offer.mjs';
import { stripeClient, paymentConfiguration } from '../lib/payments/stripe.mjs';
import { billingIdentity } from '../lib/payments/runtime.mjs';

// Prices below are isolated TEST FIXTURES, never a product configuration or seeded price.
const now = Date.now();
const start = Math.floor(now / 1000) - 3600, end = start + 30 * 86400;
const config = { live: false, mode: 'test', origin: 'https://sf.example', key: 'sk_test_fixture', webhookSecret: 'whsec_fixture' };
const product = () => ({ code: PREMIUM_PRODUCT_CODE, title: PREMIUM_TITLE, purpose: 'SOFTWARE_ACCESS', billingMode: 'SUBSCRIPTION', currency: 'aud', amountMinor: 995, priceId: 'price_fixture', interval: 'month', intervalCount: 1, termsVersion: PREMIUM_OFFER.termsVersion, live: false, enabled: true, providerApprovalReference: 'fixture-only', legalApprovalReference: 'fixture-only', approvedUntil: new Date(now + 86400000) });
const price = () => ({ id: 'price_fixture', object: 'price', active: true, type: 'recurring', billing_scheme: 'per_unit', livemode: false, currency: 'aud', unit_amount: 995, recurring: { usage_type: 'licensed', interval: 'month', interval_count: 1 } });
const record = () => ({ id: 'localSub', userId: 'u1', accountId: 'a1', account: { providerCustomerId: 'cus_fixture' }, productCode: PREMIUM_PRODUCT_CODE, priceId: 'price_fixture', amountMinor: 995, currency: 'aud', interval: 'month', intervalCount: 1, live: false, providerSubscriptionId: 'sub_fixture', providerStatus: 'checkout', activeSlot: 'u1:test:premium', checkoutSessionId: 'cs_test_fixture', createdAt: new Date(now), lastReconciledAt: new Date(now) });
const subscription = () => ({ id: 'sub_fixture', object: 'subscription', customer: 'cus_fixture', metadata: { premiumSubscriptionId: 'localSub' }, livemode: false, currency: 'aud', status: 'active', collection_method: 'charge_automatically', items: { has_more: false, data: [{ quantity: 1, price: price(), current_period_start: start, current_period_end: end }] }, latest_invoice: 'in_fixture', cancel_at_period_end: false });
const invoice = () => ({ id: 'in_fixture', object: 'invoice', livemode: false, customer: 'cus_fixture', parent: { subscription_details: { subscription: 'sub_fixture' } }, currency: 'aud', total: 995, amount_paid: 995, amount_remaining: 0, status: 'paid', hosted_invoice_url: 'https://invoice.stripe.com/i/fixture', lines: { has_more: false, data: [{ quantity: 1, pricing: { price_details: { price: 'price_fixture' } }, period: { start, end } }] } });
const payments = () => ({ has_more: false, data: [{ invoice: 'in_fixture', status: 'paid', livemode: false, currency: 'aud', amount_paid: 995, payment: { type: 'payment_intent', payment_intent: 'pi_fixture' }, status_transitions: { paid_at: start } }] });
const intent = () => ({ id: 'pi_fixture', object: 'payment_intent', status: 'succeeded', customer: 'cus_fixture', livemode: false, currency: 'aud', amount_received: 995, latest_charge: { customer: 'cus_fixture', livemode: false, currency: 'aud', amount: 995, paid: true, captured: true, amount_refunded: 0, receipt_url: 'https://pay.stripe.com/receipts/fixture' } });
const checkout = () => ({ id: 'cs_test_fixture', object: 'checkout.session', mode: 'subscription', livemode: false, customer: 'cus_fixture', client_reference_id: 'localSub', metadata: { premiumSubscriptionId: 'localSub' }, subscription: 'sub_fixture', consent: { terms_of_service: 'accepted' } });

test('no price, unverified approval, wrong product or expired approval can enable Premium', () => {
  assert.equal(approvedPremiumProduct(product(), false, now).code, PREMIUM_PRODUCT_CODE);
  for (const patch of [{ amountMinor: null }, { enabled: false }, { providerApprovalReference: null }, { legalApprovalReference: null }, { termsVersion: null }, { currency: 'usd' }, { purpose: 'PROP_TRADING' }, { code: 'CRYPTO_FUNDING' }, { interval: null }, { approvedUntil: 'invalid' }, { approvedUntil: new Date(now - 1) }, { live: true }]) assert.throws(() => approvedPremiumProduct({ ...product(), ...patch }, false, now), /NOT_CONFIGURED_OR_APPROVED|PROPOSED_PRICE_OR_TERMS_MISMATCH/);
});
test('recurring price must match gross amount, currency, mode and full interval', () => {
  assert.doesNotThrow(() => assertRecurringPrice(record(), price()));
  for (const patch of [{ type: 'one_time' }, { unit_amount: 1 }, { currency: 'usd' }, { livemode: true }, { billing_scheme: 'tiered' }, { recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' } }]) assert.throws(() => assertRecurringPrice(record(), { ...price(), ...patch }), /PRICE_MISMATCH/);
});
test('subscription cannot cross customer, local purchase, item or price boundaries', () => {
  assert.equal(checkedSubscription(record(), subscription(), 'cus_fixture').current_period_end, end);
  for (const patch of [{ customer: 'cus_other' }, { metadata: {} }, { livemode: true }, { collection_method: 'send_invoice' }, { items: { data: [], has_more: false } }]) assert.throws(() => checkedSubscription(record(), { ...subscription(), ...patch }, 'cus_fixture'), /MISMATCH/);
});
test('paid invoice requires exactly one full captured card payment and matching subscription', () => {
  const snapshot = invoiceSnapshot(record(), invoice(), payments(), intent(), 'cus_fixture');
  assert.equal(snapshot.paymentIntentId, 'pi_fixture');
  for (const patch of [{ total: 0 }, { customer: 'cus_other' }, { parent: null }, { currency: 'usd' }, { amount_paid: 1 }, { lines: { data: [], has_more: false } }]) assert.throws(() => invoiceSnapshot(record(), { ...invoice(), ...patch }, payments(), intent(), 'cus_fixture'), /MISMATCH/);
  assert.throws(() => invoiceSnapshot(record(), invoice(), { ...payments(), has_more: true }, intent(), 'cus_fixture'), /MISMATCH/);
  assert.throws(() => invoiceSnapshot(record(), invoice(), payments(), { ...intent(), status: 'processing' }, 'cus_fixture'), /MISMATCH/);
  assert.throws(() => invoiceSnapshot(record(), invoice(), payments(), { ...intent(), latest_charge: { ...intent().latest_charge, customer: 'cus_other' } }, 'cus_fixture'), /MISMATCH/);
});
test('open invoice never grants payment, and receipt links are restricted', () => {
  assert.equal(invoiceSnapshot(record(), { ...invoice(), status: 'open' }, null, null, 'cus_fixture').paymentIntentId, null);
  const snapshot = invoiceSnapshot(record(), { ...invoice(), hosted_invoice_url: 'https://invoice.stripe.com.evil.test' }, payments(), { ...intent(), latest_charge: { ...intent().latest_charge, receipt_url: 'javascript:alert(1)' } }, 'cus_fixture');
  assert.equal(snapshot.hostedInvoiceUrl, null); assert.equal(snapshot.receiptUrl, null);
});
test('server entitlement denies stale, refunded, unpaid, canceled, trial and wrong-mode records', () => {
  const r = { ...record(), live: true, providerStatus: 'active', currentInvoiceId: 'in_fixture', accessUntil: new Date(end * 1000) };
  const paid = invoiceSnapshot(record(), invoice(), payments(), intent(), 'cus_fixture');
  assert.equal(premiumAccess(r, paid, now).allowed, true);
  assert.equal(premiumAccess({ ...r, cancelAtPeriodEnd: true }, paid, now).allowed, true);
  for (const patch of [{ live: false }, { riskHold: true }, { providerStatus: 'canceled' }, { providerStatus: 'trialing' }, { providerStatus: 'past_due' }, { providerStatus: 'unpaid' }, { accessUntil: new Date(now) }, { lastReconciledAt: new Date(now - 901000) }, { lastReconciledAt: 'invalid' }]) assert.equal(premiumAccess({ ...r, ...patch }, paid, now).allowed, false);
  for (const patch of [{ status: 'open' }, { refundedMinor: 1 }, { riskHold: true }, { paymentIntentId: null }, { providerInvoiceId: 'in_other' }]) assert.equal(premiumAccess(r, { ...paid, ...patch }, now).allowed, false);
  assert.equal(premiumAccess({ ...r, live: false }, paid, now, false).allowed, true);
  assert.deepEqual(premiumAccess(null, null), { allowed: false, features: [], accessUntil: null });
});

// Logical service tests with a deliberately isolated fake repository. PostgreSQL tests remain required.
function fixture() {
  const state = { record: record(), subscription: subscription(), checkout: checkout(), invoices: new Map(), events: new Map(), refunds: new Map(), audits: [] };
  const tx = {
    $queryRaw: async () => [],
    premiumSubscription: { findUniqueOrThrow: async () => ({ ...state.record }), update: async ({ data }) => (state.record = { ...state.record, ...data }) },
    billingInvoice: {
      findUnique: async ({ where }) => state.invoices.get(where.providerInvoiceId) || null,
      upsert: async ({ where, create, update }) => { const old = state.invoices.get(where.providerInvoiceId); const item = old ? { ...old, ...update } : { id: `local_${where.providerInvoiceId}`, ...create }; state.invoices.set(where.providerInvoiceId, item); return item; },
    },
    billingInvoiceRefund: { findUnique: async ({ where }) => state.refunds.get(where.invoiceId) || null },
    premiumBillingEvent: { findUnique: async ({ where }) => state.events.get(where.eventId) || null, create: async ({ data }) => state.events.set(data.eventId, data) },
    auditEvent: { create: async ({ data }) => state.audits.push(data) },
  };
  const client = { $transaction: async fn => fn(tx) };
  const provider = { checkout: async () => state.checkout, subscription: async () => state.subscription, invoice: async () => invoice(), invoicePayments: async () => payments(), paymentIntent: async () => intent() };
  return { state, client, provider };
}
test('checkout return alone cannot grant access; provider consent is required', async () => {
  const { state, client, provider } = fixture(); state.checkout = { ...checkout(), subscription: null };
  await syncPremiumSubscription(client, 'localSub', config, null, null, provider);
  assert.equal(state.record.accessUntil, undefined);
  state.checkout = { ...checkout(), consent: null };
  await assert.rejects(syncPremiumSubscription(client, 'localSub', config, null, null, provider), /CONSENT_MISMATCH/);
});
test('canonical paid renewal grants only the paid item period; cancel-at-period-end retains access', async () => {
  const { state, client, provider } = fixture();
  state.subscription.cancel_at_period_end = true;
  await syncPremiumSubscription(client, 'localSub', config, null, null, provider);
  assert.equal(state.record.accessUntil.getTime(), end * 1000);
  assert.equal(state.record.cancelAtPeriodEnd, true);
  assert.equal(state.invoices.size, 1);
  assert.equal(state.audits.length, 1);
});
test('duplicate event is not reapplied and canonical late delivery cannot resurrect cancellation', async () => {
  const { state, client, provider } = fixture();
  const e = { id: 'evt_fixture', type: 'invoice.paid', bodyHash: 'fixture' };
  await syncPremiumSubscription(client, 'localSub', config, e, null, provider);
  assert.deepEqual(await syncPremiumSubscription(client, 'localSub', config, e, null, provider), { duplicate: true });
  state.subscription.status = 'canceled';
  await syncPremiumSubscription(client, 'localSub', config, { ...e, id: 'evt_cancel', type: 'customer.subscription.deleted' }, null, provider);
  assert.equal(state.record.accessUntil, null); assert.equal(state.record.activeSlot, null);
  state.subscription.status = 'active';
  await assert.rejects(syncPremiumSubscription(client, 'localSub', config, null, null, provider), /TERMINAL_STATE_CHANGED/);
});
test('payment failure or a pending current invoice refund revokes premium access', async () => {
  const { state, client, provider } = fixture();
  await syncPremiumSubscription(client, 'localSub', config, null, null, provider);
  state.subscription.status = 'past_due';
  await syncPremiumSubscription(client, 'localSub', config, null, null, provider);
  assert.equal(state.record.accessUntil, null);
  state.subscription.status = 'active';
  state.refunds.set('local_in_fixture', { status: 'REQUESTED' });
  await syncPremiumSubscription(client, 'localSub', config, null, null, provider);
  assert.equal(state.record.accessUntil, null);
});
test('refund and dispute are canonical, irreversible risk events for access', async () => {
  const { state, client, provider } = fixture();
  provider.paymentIntent = async () => ({ ...intent(), latest_charge: { ...intent().latest_charge, amount_refunded: 995 } });
  await syncPremiumSubscription(client, 'localSub', config, null, null, provider);
  assert.equal(state.record.accessUntil, null);
  provider.paymentIntent = async () => intent();
  await syncPremiumSubscription(client, 'localSub', config, { id: 'evt_dispute', type: 'charge.dispute.created', bodyHash: 'fixture' }, null, provider);
  assert.equal(state.record.riskHold, true); assert.equal(state.record.accessUntil, null);
});
test('a second subscription checkout request reuses the server reservation across request keys', async () => {
  let created = 0, current;
  const tx = {
    $queryRaw: async () => [], auditEvent: { create: async () => {} },
    premiumSubscription: {
      findUnique: async ({ where }) => where.activeSlot ? current || null : null,
      findUniqueOrThrow: async () => current,
      create: async ({ data }) => { created++; current = { ...data, id: 'localSub', createdAt: new Date(), providerStatus: 'creating' }; return current; },
      update: async ({ data }) => (current = { ...current, ...data }),
    },
  };
  const client = { billingAccount: { upsert: async () => ({ id: 'a1', providerCustomerId: 'cus_fixture' }) }, $transaction: async fn => fn(tx) };
  const provider = { price: async () => price(), createSubscriptionCheckout: async () => ({ ...checkout(), url: 'https://checkout.stripe.com/c/pay/fixture', currency: 'aud', amount_total: 995 }) };
  const first = await createPremiumCheckout(client, { id: 'u1' }, product(), config, 'first-key', { accepted: true, termsVersion: PREMIUM_OFFER.termsVersion }, provider);
  const second = await createPremiumCheckout(client, { id: 'u1' }, product(), config, 'second-key', { accepted: true, termsVersion: PREMIUM_OFFER.termsVersion }, provider);
  assert.equal(first.subscriptionId, second.subscriptionId); assert.equal(created, 1);
});
test('provider subscription request uses recurring mode, fixed price, customer and consent', async () => {
  let captured;
  const client = stripeClient(config, async (url, init) => { captured = { url, ...init }; return Response.json({ livemode: false }); });
  await client.createSubscriptionCheckout(record(), 'cus_fixture');
  const fields = new URLSearchParams(captured.body);
  assert.equal(fields.get('mode'), 'subscription');
  assert.equal(fields.get('customer'), 'cus_fixture');
  assert.equal(fields.get('line_items[0][price]'), 'price_fixture');
  assert.equal(fields.get('consent_collection[terms_of_service]'), 'required');
  assert.equal(fields.has('subscription_data[trial_period_days]'), false);
  assert.equal(fields.get('subscription_data[metadata][premiumSubscriptionId]'), 'localSub');
});
test('premium calculations validate finite ranges and never execute financial transactions', () => {
  assert.deepEqual(calculatePremiumRisk({ amount: 1000, downsidePercent: 20, feePercent: 1 }), { amount: 1000, fee: 10, marketLoss: 200, remaining: 790, hypothetical: true, liveMarketData: false });
  for (const patch of [{ amount: 0 }, { amount: Infinity }, { downsidePercent: -1 }, { feePercent: 101 }, { amount: '1000' }]) assert.throws(() => calculatePremiumRisk({ amount: 1000, downsidePercent: 20, feePercent: 1, ...patch }), /INVALID/);
});

test('billing identity checks revoked and expired DB sessions instead of browser entitlements', async () => {
  const request = new Request('https://sf.example/api/billing/subscriptions', { headers: { cookie: `__Host-sf_session=${'a'.repeat(64)}` } });
  let session = { userId: 'u1', expiresAt: new Date(Date.now() + 60000), revokedAt: null, user: { id: 'u1', status: 'ACTIVE', emailVerifiedAt: new Date(), mfaEnabled: true }, mfaVerifiedAt: new Date() };
  const client = { authSession: { findUnique: async ({ where }) => { assert.notEqual(where.tokenHash, 'a'.repeat(64)); return session; } }, paymentRateLimit: { upsert: async () => ({ count: 1 }) } };
  assert.equal((await billingIdentity(request, client)).id, 'u1');
  session = { ...session, revokedAt: new Date() };
  await assert.rejects(billingIdentity(request, client), /AUTHENTICATION_REQUIRED/);
  session = { ...session, revokedAt: null, expiresAt: new Date(Date.now() - 1) };
  await assert.rejects(billingIdentity(request, client), /AUTHENTICATION_REQUIRED/);
});

test('billing mutations reject cross-origin, missing recent MFA and customer refund privileges', async () => {
  const previous = process.env.PAYMENTS_ORIGIN; process.env.PAYMENTS_ORIGIN = 'https://sf.example';
  try {
    const headers = { cookie: `__Host-sf_session=${'a'.repeat(64)}`, origin: 'https://sf.example', 'content-type': 'application/json' };
    const request = new Request('https://sf.example/api/billing/portal', { method: 'POST', headers, body: '{}' });
    let session = { userId: 'u1', expiresAt: new Date(Date.now() + 60000), revokedAt: null, user: { id: 'u1', status: 'ACTIVE', emailVerifiedAt: new Date(), mfaEnabled: true, billingRole: 'CUSTOMER' }, mfaVerifiedAt: new Date() };
    const client = { authSession: { findUnique: async () => session }, paymentRateLimit: { upsert: async () => ({ count: 1 }) } };
    await assert.rejects(billingIdentity(new Request(request, { headers: { ...headers, origin: 'https://evil.test' } }), client, true), /ORIGIN_REJECTED/);
    await assert.rejects(billingIdentity(request, client, true, true), /STAFF_REQUIRED/);
    session = { ...session, mfaVerifiedAt: new Date(Date.now() - 16 * 60000) };
    await assert.rejects(billingIdentity(request, client, true), /RECENT_MFA_REQUIRED/);
  } finally { if (previous === undefined) delete process.env.PAYMENTS_ORIGIN; else process.env.PAYMENTS_ORIGIN = previous; }
});

test('995 cents per month is a proposal, never permission to activate live sales', () => {
  assert.equal(PREMIUM_OFFER.amountMinor, 995); assert.equal(PREMIUM_OFFER.interval, 'month'); assert.equal(PREMIUM_OFFER.intervalCount, 1);
  assert.equal(PREMIUM_OFFER.pricingStatus, 'PROPOSED'); assert.equal(PREMIUM_OFFER.ownerPricingApprovalReference, null);
  assert.throws(() => approvedPremiumProduct({ ...product(), live: true, pricingApprovalReference: 'fixture-only' }, true), /FINAL_PREMIUM_PRICING_APPROVAL_REQUIRED/);
  for (const patch of [{ amountMinor: 994 }, { amountMinor: 996 }, { currency: 'usd' }, { interval: 'year' }, { intervalCount: 2 }]) assert.throws(() => approvedPremiumProduct({ ...product(), ...patch }, false), /PROPOSED_PRICE_OR_TERMS_MISMATCH/);
});

test('terms must be explicitly accepted and the proposal version must match', () => {
  assert.doesNotThrow(() => requirePremiumConsent({ accepted: true, termsVersion: PREMIUM_OFFER.termsVersion }));
  for (const consent of [null, {}, { accepted: false, termsVersion: PREMIUM_OFFER.termsVersion }, { accepted: 'true', termsVersion: PREMIUM_OFFER.termsVersion }, { accepted: true, termsVersion: 'old' }]) assert.throws(() => requirePremiumConsent(consent), /TERMS_ACCEPTANCE_REQUIRED/);
});

test('cancellation is confirmed at Stripe, preserves paid access, and repeated requests do not repeat the mutation', async () => {
  const { state, client, provider } = fixture(); let calls = 0;
  provider.cancelSubscriptionAtPeriodEnd = async () => { calls++; state.subscription.cancel_at_period_end = true; return state.subscription; };
  const result = await cancelPremiumRecord(client, state.record, config, 'u1', provider);
  assert.equal(result.cancellationConfirmed, true); assert.equal(result.noFurtherRenewals, true);
  assert.equal(result.accessUntil, new Date(end * 1000).toISOString());
  assert.equal(state.record.cancelAtPeriodEnd, true);
  await cancelPremiumRecord(client, state.record, config, 'u1', provider);
  assert.equal(calls, 1);
  const currentInvoice = state.invoices.get('in_fixture');
  assert.equal(premiumAccess(state.record, currentInvoice, end * 1000, false).allowed, false);
});

test('cancellation cannot target another customer or claim success before provider confirmation', async () => {
  const { state, client, provider } = fixture();
  await assert.rejects(cancelPremiumRecord(client, state.record, config, 'u2', provider), /NOT_FOUND/);
  provider.cancelSubscriptionAtPeriodEnd = async () => ({ ...state.subscription, cancel_at_period_end: false });
  await assert.rejects(cancelPremiumRecord(client, state.record, config, 'u1', provider), /CANCELLATION_NOT_CONFIRMED/);
  assert.notEqual(state.record.cancelAtPeriodEnd, true);
});

test('disabling new live sales does not prevent existing customer cancellation configuration', () => {
  const env = { PAYMENTS_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_fixtureOnly', STRIPE_WEBHOOK_SECRET: 'whsec_fixtureOnly', PAYMENTS_ORIGIN: 'https://sf.example', PAYMENTS_LIVE_ENABLED: 'false' };
  assert.throws(() => paymentConfiguration(env), /LIVE_PAYMENT_APPROVALS_REQUIRED/);
  assert.equal(paymentConfiguration(env, { existingBilling: true }).live, true);
  assert.throws(() => paymentConfiguration({ ...env, STRIPE_SECRET_KEY: '' }, { existingBilling: true }), /CREDENTIALS/);
});

test('Stripe cancellation sets period-end flag without immediate termination or proration', async () => {
  let captured;
  const client = stripeClient(config, async (url, init) => { captured = { url, ...init }; return Response.json({ livemode: false }); });
  await client.cancelSubscriptionAtPeriodEnd('sub_fixture');
  assert.equal(captured.method, 'POST'); assert.equal(captured.url, 'https://api.stripe.com/v1/subscriptions/sub_fixture');
  const fields = new URLSearchParams(captured.body);
  assert.equal(fields.get('cancel_at_period_end'), 'true'); assert.equal(fields.get('proration_behavior'), 'none');
  assert.equal(fields.has('items'), false);
});
