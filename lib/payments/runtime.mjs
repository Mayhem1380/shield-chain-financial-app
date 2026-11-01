import { createHash, randomUUID } from 'node:crypto';
import { PaymentError, paymentConfiguration, stripeClient, verifyStripeEvent, paymentSnapshot } from './stripe.mjs';

let database;
async function db() {
  if (!process.env.DATABASE_URL) throw new PaymentError('PAYMENT_DATABASE_UNAVAILABLE', 503);
  if (!database) {
    const { PrismaClient } = await import('@prisma/client');
    database = new PrismaClient();
  }
  return database;
}
const hash = value => createHash('sha256').update(value).digest('hex');
const merchantPurposes = new Set(['SOFTWARE_ACCESS', 'EDUCATION_SERVICE']);
const acceptedEvents = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'charge.refunded', 'charge.dispute.created', 'refund.created', 'refund.updated', 'refund.failed']);

async function lock(tx, key) {
  await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtext(${key}))`;
}
async function audit(tx, action, orderId, actorUserId = null) {
  await tx.auditEvent.create({ data: { actorUserId, action, resource: 'payment', resourceId: orderId } });
}
async function limit(client, key, max) {
  const window = Math.floor(Date.now() / 60000);
  const record = await client.paymentRateLimit.upsert({
    where: { key: `${key}:${window}` }, create: { key: `${key}:${window}`, count: 1, expiresAt: new Date((window + 2) * 60000) }, update: { count: { increment: 1 } },
  });
  if (record.count > max) throw new PaymentError('PAYMENT_RATE_LIMITED', 429);
}

async function identity(request, client, mutation = false, staff = false) {
  if (mutation) {
    if (!process.env.PAYMENTS_ORIGIN || request.headers.get('origin') !== process.env.PAYMENTS_ORIGIN || request.headers.get('sec-fetch-site') === 'cross-site') throw new PaymentError('REQUEST_ORIGIN_REJECTED', 403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new PaymentError('JSON_REQUIRED', 415);
  }
  const token = /(?:^|;\s*)__Host-sf_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('cookie') || '')?.[1];
  if (!token) throw new PaymentError('AUTHENTICATION_REQUIRED', 401);
  const session = await client.authSession.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now || session.user.status !== 'ACTIVE' || !session.user.emailVerifiedAt) throw new PaymentError('AUTHENTICATION_REQUIRED', 401);
  if (mutation && (!session.user.mfaEnabled || !session.mfaVerifiedAt || session.mfaVerifiedAt.getTime() > now || now - session.mfaVerifiedAt.getTime() > 15 * 60000)) throw new PaymentError('RECENT_MFA_REQUIRED', 403);
  if (staff && !['REFUNDS', 'ADMIN'].includes(session.user.billingRole)) throw new PaymentError('BILLING_STAFF_REQUIRED', 403);
  await limit(client, `user:${session.userId}`, mutation ? 10 : 60);
  return session.user;
}

export async function readLimited(request, maximum = 16384) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) { await reader.cancel(); throw new PaymentError('REQUEST_TOO_LARGE', 413); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
async function body(request) {
  let data;
  try { data = JSON.parse((await readLimited(request)).toString('utf8')); }
  catch (error) { if (error instanceof PaymentError) throw error; throw new PaymentError('INVALID_JSON'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new PaymentError('INVALID_JSON');
  return data;
}

export async function createCheckout(request) {
  const client = await db();
  const user = await identity(request, client, true);
  const config = paymentConfiguration();
  const input = await body(request);
  const key = request.headers.get('idempotency-key');
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key || '') || typeof input.productCode !== 'string' || !/^[A-Z0-9_-]{1,60}$/.test(input.productCode)) throw new PaymentError('PRODUCT_AND_IDEMPOTENCY_KEY_REQUIRED');
  const product = await client.paymentProduct.findUnique({ where: { code: input.productCode } });
  if (!product?.enabled || !merchantPurposes.has(product.purpose) || product.live !== config.live || !product.providerApprovalReference || !product.legalApprovalReference || !product.approvedUntil || product.approvedUntil.getTime() <= Date.now() || product.currency !== 'aud' || !Number.isSafeInteger(product.amountMinor) || product.amountMinor < 50 || product.amountMinor > 100000) throw new PaymentError('PRODUCT_NOT_APPROVED', 403);
  const provider = stripeClient(config);
  const price = await provider.price(product.priceId);
  if (!price.active || price.type !== 'one_time' || price.currency !== product.currency || price.unit_amount !== product.amountMinor || price.livemode !== config.live || price.custom_unit_amount) throw new PaymentError('PROVIDER_PRICE_MISMATCH', 409);
  const requestKey = hash(`${user.id}:${key}`);
  const order = await client.$transaction(async tx => {
    await lock(tx, requestKey);
    const existing = await tx.paymentOrder.findUnique({ where: { requestKey } });
    if (existing) {
      if (existing.productCode !== product.code || existing.amountMinor !== product.amountMinor || existing.priceId !== product.priceId || existing.live !== config.live) throw new PaymentError('IDEMPOTENCY_CONFLICT', 409);
      return existing;
    }
    const created = await tx.paymentOrder.create({ data: { userId: user.id, productCode: product.code, requestKey, priceId: product.priceId, amountMinor: product.amountMinor, currency: product.currency, live: config.live } });
    await audit(tx, 'payment.checkout.requested', created.id, user.id);
    return created;
  });
  // Never reuse an old Stripe idempotency key after provider retention may have expired.
  if (Date.now() - order.createdAt.getTime() > 20 * 3600000) throw new PaymentError('ORDER_REQUIRES_RECONCILIATION', 409);
  if (order.status !== 'CREATING' && order.status !== 'CHECKOUT') throw new PaymentError('ORDER_NOT_PAYABLE', 409);
  if (order.checkoutSessionId) return { orderId: order.id, checkoutUrl: order.checkoutUrl };
  const checkout = await provider.createCheckout(order, user.email);
  let url;
  try { url = new URL(checkout.url); } catch { throw new PaymentError('CHECKOUT_RESPONSE_INVALID', 502); }
  if (checkout.object !== 'checkout.session' || checkout.livemode !== config.live || checkout.client_reference_id !== order.id || checkout.amount_total !== order.amountMinor || checkout.currency !== order.currency || url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new PaymentError('CHECKOUT_RESPONSE_INVALID', 502);
  await client.$transaction(async tx => {
    await lock(tx, order.id);
    const current = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (current.checkoutSessionId && current.checkoutSessionId !== checkout.id) throw new PaymentError('CHECKOUT_IDEMPOTENCY_CONFLICT', 409);
    await tx.paymentOrder.update({ where: { id: order.id }, data: { checkoutSessionId: checkout.id, checkoutUrl: url.href, ...(current.status === 'CREATING' ? { status: 'CHECKOUT' } : {}) } });
    await audit(tx, 'payment.checkout.created', order.id, user.id);
  });
  return { orderId: order.id, checkoutUrl: url.href };
}

export function reconciledState(order, snapshot, now = new Date()) {
  if (!snapshot.paid) return { ...(snapshot.expired && !order.paidAt ? { status: 'EXPIRED' } : {}), lastReconciledAt: now };
  if (order.paymentIntentId && order.paymentIntentId !== snapshot.paymentIntentId) throw new PaymentError('PAYMENT_INTENT_CHANGED', 409);
  const refundedMinor = Math.max(order.refundedMinor, snapshot.refundedMinor);
  const riskHold = order.riskHold || snapshot.riskHold;
  return { status: riskHold ? 'REVIEW' : refundedMinor >= order.amountMinor ? 'REFUNDED' : refundedMinor > 0 ? 'PARTIALLY_REFUNDED' : 'PAID', paymentIntentId: snapshot.paymentIntentId, providerCustomerId: snapshot.customerId, refundedMinor, riskHold, receiptUrl: snapshot.receiptUrl || order.receiptUrl, paidAt: order.paidAt || now, lastReconciledAt: now };
}

async function reconcile(client, order, config, event = null, actor = null) {
  if (!order.checkoutSessionId || order.live !== config.live) throw new PaymentError('ORDER_REQUIRES_RECONCILIATION', 409);
  const snapshot = paymentSnapshot(order, await stripeClient(config).checkout(order.checkoutSessionId), config.live);
  const pendingRefund = await client.paymentRefund.findUnique({ where: { orderId: order.id } });
  const refund = pendingRefund?.providerRefundId ? await stripeClient(config).refundById(pendingRefund.providerRefundId) : null;
  if (refund && (refund.payment_intent !== snapshot.paymentIntentId || refund.amount !== order.amountMinor || refund.currency !== order.currency)) throw new PaymentError('REFUND_RECONCILIATION_MISMATCH', 409);
  if (event?.type === 'charge.dispute.created') snapshot.riskHold = true;
  return client.$transaction(async tx => {
    await lock(tx, order.id);
    if (event && await tx.paymentEvent.findUnique({ where: { eventId: event.id } })) return { duplicate: true };
    const current = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
    const updated = await tx.paymentOrder.update({ where: { id: order.id }, data: reconciledState(current, snapshot) });
    if (refund) {
      const currentRefund = await tx.paymentRefund.findUniqueOrThrow({ where: { orderId: order.id } });
      await tx.paymentRefund.update({ where: { orderId: order.id }, data: { status: reconciledRefundStatus(currentRefund.status, refund.status) } });
    }
    if (event) await tx.paymentEvent.create({ data: { eventId: event.id, orderId: order.id, eventType: event.type, bodyHash: event.bodyHash } });
    await audit(tx, event ? 'payment.webhook.reconciled' : 'payment.reconciled', order.id, actor);
    return { orderId: updated.id, status: updated.status, refundedMinor: updated.refundedMinor };
  });
}

export async function receiveWebhook(request) {
  const config = paymentConfiguration();
  const raw = await readLimited(request, 262144);
  const event = verifyStripeEvent(raw, request.headers.get('stripe-signature'), config);
  if (!acceptedEvents.has(event.type)) return { ignored: true };
  const client = await db();
  if (await client.paymentEvent.findUnique({ where: { eventId: event.id } })) return { duplicate: true };
  const object = event.data.object;
  let order;
  if (event.type.startsWith('checkout.session.')) order = await client.paymentOrder.findUnique({ where: { checkoutSessionId: object.id } });
  else {
    let paymentIntentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
    // Dispute payloads expose payment_intent on current Stripe API versions.
    if (!paymentIntentId) throw new PaymentError('WEBHOOK_REQUIRES_MANUAL_RECONCILIATION', 503);
    order = await client.paymentOrder.findUnique({ where: { paymentIntentId } });
  }
  // An early delivery is retried rather than acknowledged before checkout persistence.
  if (!order) throw new PaymentError('WEBHOOK_ORDER_NOT_READY', 503);
  return reconcile(client, order, config, { ...event, bodyHash: hash(raw) });
}

export async function listPayments(request) {
  const client = await db();
  const user = await identity(request, client);
  return { payments: await client.paymentOrder.findMany({ where: { userId: user.id }, take: 100, orderBy: { createdAt: 'desc' }, select: { id: true, productCode: true, amountMinor: true, currency: true, status: true, refundedMinor: true, riskHold: true, receiptUrl: true, createdAt: true, paidAt: true, lastReconciledAt: true } }) };
}

export async function listPaymentProducts(request) {
  const client = await db();
  await identity(request, client);
  const config = paymentConfiguration();
  return { mode: config.mode, products: await client.paymentProduct.findMany({
    where: { enabled: true, live: config.live, purpose: { in: [...merchantPurposes] }, currency: 'aud', amountMinor: { gte: 50, lte: 100000 }, providerApprovalReference: { not: null }, legalApprovalReference: { not: null }, approvedUntil: { gt: new Date() } },
    select: { code: true, title: true, amountMinor: true, currency: true }, orderBy: { code: 'asc' },
  }) };
}

export async function reconcilePayment(request) {
  const client = await db();
  const user = await identity(request, client, true);
  const input = await body(request);
  if (typeof input.orderId !== 'string') throw new PaymentError('ORDER_ID_REQUIRED');
  const order = await client.paymentOrder.findFirst({ where: { id: input.orderId, userId: user.id } });
  if (!order) throw new PaymentError('ORDER_NOT_FOUND', 404);
  return reconcile(client, order, paymentConfiguration(), null, user.id);
}

export async function refundPayment(request) {
  const client = await db();
  const user = await identity(request, client, true, true);
  const config = paymentConfiguration();
  const input = await body(request);
  if (typeof input.orderId !== 'string' || !['CUSTOMER_REQUEST', 'DUPLICATE', 'SERVICE_CANCELLED'].includes(input.reason)) throw new PaymentError('REFUND_INPUT_INVALID');
  const order = await client.paymentOrder.findUnique({ where: { id: input.orderId } });
  if (!order || order.live !== config.live) throw new PaymentError('ORDER_NOT_FOUND', 404);
  await reconcile(client, order, config, null, user.id);
  const reserved = await client.$transaction(async tx => {
    await lock(tx, order.id);
    const existing = await tx.paymentRefund.findUnique({ where: { orderId: order.id } });
    if (existing) return existing;
    const current = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (current.status !== 'PAID' || current.riskHold || current.refundedMinor || !current.paymentIntentId) throw new PaymentError('REFUND_REQUIRES_REVIEW', 409);
    const refund = await tx.paymentRefund.create({ data: { orderId: order.id, requestedBy: user.id, reason: input.reason } });
    await audit(tx, 'payment.refund.requested', order.id, user.id);
    return refund;
  });
  if (reserved.status !== 'REQUESTED') return { refundId: reserved.id, status: reserved.status };
  if (Date.now() - reserved.createdAt.getTime() > 20 * 3600000) throw new PaymentError('REFUND_REQUIRES_MANUAL_RECONCILIATION', 409);
  const current = await client.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  const result = await stripeClient(config).refund(current);
  if (result.object !== 'refund' || result.payment_intent !== current.paymentIntentId || result.amount !== current.amountMinor || result.currency !== current.currency) throw new PaymentError('REFUND_RESPONSE_INVALID', 502);
  await client.$transaction(async tx => {
    await lock(tx, order.id);
    const currentRefund = await tx.paymentRefund.findUniqueOrThrow({ where: { orderId: order.id } });
    await tx.paymentRefund.update({ where: { orderId: order.id }, data: { providerRefundId: result.id, status: reconciledRefundStatus(currentRefund.status, result.status) } });
    await audit(tx, 'payment.refund.submitted', order.id, user.id);
  });
  await reconcile(client, current, config, null, user.id);
  return { refundId: reserved.id, status: result.status };
}

export async function paymentResponse(action, request) {
  const requestId = randomUUID();
  try { return Response.json(await action(request), { headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } }); }
  catch (error) {
    const known = error instanceof PaymentError;
    return Response.json({ error: known ? error.code : 'PAYMENT_SERVICE_UNAVAILABLE', requestId }, { status: known ? error.status : 503, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } });
  }
}

export function reconciledRefundStatus(current, providerStatus) {
  if (current === 'SUCCEEDED' || providerStatus === 'succeeded') return 'SUCCEEDED';
  if (current === 'FAILED_REVIEW' || ['failed', 'canceled'].includes(providerStatus)) return 'FAILED_REVIEW';
  return 'PENDING';
}

// Explicit CLI worker, not a publicly callable unauthenticated cron route.
export async function reconcilePaymentBatch() {
  const client = await db();
  const config = paymentConfiguration();
  const orders = await client.paymentOrder.findMany({
    where: { live: config.live, checkoutSessionId: { not: null } },
    orderBy: [{ lastReconciledAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }], take: 100,
  });
  const results = [];
  for (const order of orders) {
    try { results.push(await reconcile(client, order, config)); }
    catch (error) {
      await client.$transaction(tx => audit(tx, 'payment.reconciliation.requires-review', order.id));
      results.push({ orderId: order.id, error: error instanceof PaymentError ? error.code : 'PAYMENT_SERVICE_UNAVAILABLE' });
    }
  }
  await client.paymentRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return results;
}
