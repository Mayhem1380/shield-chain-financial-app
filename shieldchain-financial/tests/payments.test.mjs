import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { paymentConfiguration, verifyStripeEvent, stripeClient, paymentSnapshot } from '../lib/payments/stripe.mjs';
import { reconciledState, reconciledRefundStatus, readLimited, paymentResponse } from '../lib/payments/runtime.mjs';

const env = { PAYMENTS_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_unitOnly', STRIPE_WEBHOOK_SECRET: 'whsec_unitOnly', PAYMENTS_ORIGIN: 'https://shieldchain.example' };
const config = paymentConfiguration(env);
const now = 1800000000000;
const event = { id: 'evt_example', object: 'event', livemode: false, type: 'checkout.session.completed', data: { object: { id: 'cs_test_abc' } } };
const raw = Buffer.from(JSON.stringify(event));
const signature = (bytes = raw, time = now / 1000) => `t=${time},v1=${createHmac('sha256', config.webhookSecret).update(`${time}.`).update(bytes).digest('hex')}`;

test('credentials never fall back to a simulated provider', () => {
  assert.throws(() => paymentConfiguration({}), /PAYMENTS_NOT_CONFIGURED/);
  assert.throws(() => paymentConfiguration({ ...env, PAYMENTS_MODE: 'live' }), /WRONG_MODE/);
  assert.throws(() => paymentConfiguration({ ...env, PAYMENTS_MODE: 'live', STRIPE_SECRET_KEY: 'sk_live_unitOnly' }), /APPROVALS_REQUIRED/);
  assert.throws(() => paymentConfiguration({ ...env, PAYMENTS_ORIGIN: 'http://example.com' }), /ORIGIN_INVALID/);
  assert.throws(() => paymentConfiguration({ ...env, PAYMENTS_ORIGIN: 'https://example.com/evil' }), /ORIGIN_INVALID/);
});
test('webhook verifies exact raw bytes and accepts rotating v1 signatures', () => {
  assert.equal(verifyStripeEvent(raw, signature(), config, now).id, event.id);
  assert.equal(verifyStripeEvent(raw, `${signature()},v1=${'0'.repeat(64)}`, config, now).id, event.id);
  assert.throws(() => verifyStripeEvent(Buffer.from(raw + ' '), signature(), config, now), /INVALID_SIGNATURE/);
  assert.throws(() => verifyStripeEvent(raw, signature(), config, now + 301000), /EXPIRED/);
  assert.throws(() => verifyStripeEvent(raw, signature(), config, now - 301000), /EXPIRED/);
  assert.throws(() => verifyStripeEvent(raw, `t=1,${signature()}`, config, now), /INVALID_SIGNATURE/);
  assert.throws(() => verifyStripeEvent(raw, 't=abc,v1=wrong', config, now), /INVALID_SIGNATURE/);
});
test('webhook mode and Connect account confusion are rejected', () => {
  for (const e of [{ ...event, livemode: true }, { ...event, account: 'acct_other' }]) {
    const bytes = Buffer.from(JSON.stringify(e));
    assert.throws(() => verifyStripeEvent(bytes, signature(bytes), config, now), /MODE_MISMATCH/);
  }
});

const order = { id: 'orderA', checkoutSessionId: 'cs_test_abc', priceId: 'price_abc', amountMinor: 1000, currency: 'aud', refundedMinor: 0, riskHold: false, createdAt: new Date(now) };
const session = () => ({ object: 'checkout.session', id: order.checkoutSessionId, livemode: false, client_reference_id: order.id, metadata: { orderId: order.id }, currency: 'aud', amount_total: 1000, payment_status: 'paid', customer: 'cus_abc', payment_intent: { id: 'pi_abc', metadata: { orderId: order.id }, status: 'succeeded', currency: 'aud', amount_received: 1000, livemode: false, latest_charge: { currency: 'aud', amount: 1000, paid: true, captured: true, livemode: false, amount_refunded: 0, receipt_url: 'https://pay.stripe.com/receipts/abc' } } });

test('confirmation checks captured payment and exact order amount/currency/metadata', () => {
  assert.equal(paymentSnapshot(order, session(), false).paid, true);
  for (const change of [{ currency: 'usd' }, { amount_total: 1 }, { client_reference_id: 'other' }, { metadata: {} }, { livemode: true }]) assert.throws(() => paymentSnapshot(order, { ...session(), ...change }, false), /MISMATCH/);
  const unpaid = { ...session(), payment_status: 'unpaid' };
  assert.equal(paymentSnapshot(order, unpaid, false).paid, false);
  const pending = session(); pending.payment_intent.status = 'processing';
  assert.throws(() => paymentSnapshot(order, pending, false), /CONFIRMATION_MISMATCH/);
  const corruptRefund = session(); corruptRefund.payment_intent.latest_charge.amount_refunded = 1001;
  assert.throws(() => paymentSnapshot(order, corruptRefund, false), /MISMATCH/);
});
test('receipt links cannot redirect customers to an arbitrary host', () => {
  const s = session(); s.payment_intent.latest_charge.receipt_url = 'https://pay.stripe.com.attacker.example/';
  assert.equal(paymentSnapshot(order, s, false).receiptUrl, null);
});
test('out-of-order updates never reverse refunds or release risk holds', () => {
  const snapshot = paymentSnapshot(order, session(), false);
  assert.equal(reconciledState(order, snapshot).status, 'PAID');
  assert.equal(reconciledState({ ...order, refundedMinor: 1000 }, snapshot).status, 'REFUNDED');
  assert.equal(reconciledState({ ...order, refundedMinor: 500 }, snapshot).status, 'PARTIALLY_REFUNDED');
  assert.equal(reconciledState({ ...order, riskHold: true }, snapshot).status, 'REVIEW');
  assert.equal(reconciledState({ ...order, paidAt: new Date(now) }, { paid: false, expired: true }).status, undefined);
  assert.throws(() => reconciledState({ ...order, paymentIntentId: 'pi_other' }, snapshot), /INTENT_CHANGED/);
});
test('real Stripe request contract uses server price, fixed origin and stable operation keys', async () => {
  const requests = [];
  const client = stripeClient(config, async (url, init) => { requests.push({ url, ...init }); return Response.json({ id: 'cs_test_abc', livemode: false }); });
  await client.createCheckout(order, 'customer@example.test');
  await client.createCheckout(order, 'customer@example.test');
  assert.equal(requests[0].url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
  const fields = new URLSearchParams(requests[0].body);
  assert.equal(fields.get('line_items[0][price]'), order.priceId);
  assert.equal(fields.get('payment_method_options[card][request_three_d_secure]'), 'any');
  assert.equal(fields.get('success_url'), 'https://shieldchain.example/billing?order=orderA');
  assert.equal(requests[0].redirect, 'error');
  await client.refund({ ...order, paymentIntentId: 'pi_abc' });
  assert.equal(requests[2].url, 'https://api.stripe.com/v1/refunds');
  assert.equal(new URLSearchParams(requests[2].body).get('amount'), '1000');
});
test('provider errors redact secrets and never become successful checkout', async () => {
  const client = stripeClient(config, async () => Response.json({ error: { message: 'secret card data' } }, { status: 402 }));
  await assert.rejects(client.createCheckout(order, 'x@y.test'), /PROVIDER_REQUEST_FAILED/);
  const response = await paymentResponse(async () => { throw new Error('password SECRET'); }, new Request('https://example.test'));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('SECRET'), false);
});
test('streamed bodies enforce limits even without Content-Length', async () => {
  const request = new Request('https://example.test', { method: 'POST', body: '123456' });
  await assert.rejects(readLimited(request, 5), /TOO_LARGE/);
});

test('late pending refund responses cannot regress terminal refund state', () => {
  assert.equal(reconciledRefundStatus('SUCCEEDED', 'pending'), 'SUCCEEDED');
  assert.equal(reconciledRefundStatus('FAILED_REVIEW', 'pending'), 'FAILED_REVIEW');
  assert.equal(reconciledRefundStatus('PENDING', 'succeeded'), 'SUCCEEDED');
  assert.equal(reconciledRefundStatus('REQUESTED', 'failed'), 'FAILED_REVIEW');
});
