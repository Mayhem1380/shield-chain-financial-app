import { createHash, randomUUID } from 'node:crypto';
import { PaymentError, paymentConfiguration, stripeClient } from './stripe.mjs';
import { paymentDb, billingIdentity, readBillingBody, paymentLock, paymentAudit, reconciledRefundStatus } from './runtime.mjs';
import { PREMIUM_PRODUCT_CODE, approvedPremiumProduct, requirePremiumConsent, assertRecurringPrice, checkedSubscription, invoiceSnapshot, premiumAccess, providerId, stripeLink } from './premium-policy.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const terminal = new Set(['canceled', 'incomplete_expired', 'expired']);
const retryExpired = record => Date.now() - record.createdAt.getTime() > 20 * 3600000;

async function customerAccount(client, user, config, provider) {
  const account = await client.billingAccount.upsert({ where: { userId_live: { userId: user.id, live: config.live } }, create: { userId: user.id, live: config.live }, update: {} });
  if (account.providerCustomerId) return account;
  if (retryExpired(account)) throw new PaymentError('CUSTOMER_REQUIRES_RECONCILIATION', 409);
  const customer = await provider.createCustomer(account, user.email);
  if (customer.object !== 'customer' || !/^cus_[A-Za-z0-9]+$/.test(customer.id) || customer.livemode !== config.live || customer.metadata?.billingAccountId !== account.id || customer.deleted) throw new PaymentError('CUSTOMER_RESPONSE_MISMATCH', 502);
  return client.$transaction(async tx => {
    await paymentLock(tx, `customer:${account.id}`);
    const current = await tx.billingAccount.findUniqueOrThrow({ where: { id: account.id } });
    if (current.providerCustomerId && current.providerCustomerId !== customer.id) throw new PaymentError('CUSTOMER_IDEMPOTENCY_CONFLICT', 409);
    return tx.billingAccount.update({ where: { id: account.id }, data: { providerCustomerId: customer.id } });
  });
}

export async function createPremiumCheckout(client, user, product, config, key, consent, provider = stripeClient(config)) {
  approvedPremiumProduct(product, config.live);
  requirePremiumConsent(consent);
  const price = await provider.price(product.priceId);
  if (!price.active) throw new PaymentError('PREMIUM_PRICE_INACTIVE', 409);
  assertRecurringPrice(product, price);
  const account = await customerAccount(client, user, config, provider);
  const activeSlot = `${user.id}:${config.mode}:${PREMIUM_PRODUCT_CODE}`;
  const requestKey = hash(`${user.id}:${key}`);
  const record = await client.$transaction(async tx => {
    await paymentLock(tx, activeSlot);
    const known = await tx.premiumSubscription.findUnique({ where: { requestKey } });
    if (known) {
      if (known.productCode !== product.code || known.priceId !== product.priceId || known.amountMinor !== product.amountMinor || known.live !== config.live || known.termsVersion !== product.termsVersion) throw new PaymentError('IDEMPOTENCY_CONFLICT', 409);
      return known;
    }
    const active = await tx.premiumSubscription.findUnique({ where: { activeSlot } });
    if (active) {
      if (['creating', 'checkout'].includes(active.providerStatus) && active.priceId === product.priceId && active.amountMinor === product.amountMinor && active.termsVersion === product.termsVersion) return active;
      throw new PaymentError('SUBSCRIPTION_ALREADY_EXISTS', 409);
    }
    const created = await tx.premiumSubscription.create({ data: { userId: user.id, accountId: account.id, productCode: product.code, requestKey, activeSlot, priceId: product.priceId, amountMinor: product.amountMinor, currency: product.currency, interval: product.interval, intervalCount: product.intervalCount, termsVersion: product.termsVersion, termsAcceptedAt: new Date(), live: config.live } });
    await paymentAudit(tx, 'premium.checkout.requested', created.id, user.id);
    return created;
  });
  if (retryExpired(record)) throw new PaymentError('SUBSCRIPTION_CHECKOUT_REQUIRES_RECONCILIATION', 409);
  if (!['creating', 'checkout'].includes(record.providerStatus)) throw new PaymentError('SUBSCRIPTION_ALREADY_EXISTS', 409);
  if (record.checkoutSessionId) return { subscriptionId: record.id, checkoutUrl: record.checkoutUrl };
  const checkout = await provider.createSubscriptionCheckout(record, account.providerCustomerId);
  const checkoutUrl = stripeLink(checkout.url, 'checkout.stripe.com');
  if (!checkoutUrl || checkout.object !== 'checkout.session' || checkout.mode !== 'subscription' || checkout.livemode !== config.live || checkout.client_reference_id !== record.id || checkout.metadata?.premiumSubscriptionId !== record.id || providerId(checkout.customer) !== account.providerCustomerId || checkout.currency !== record.currency || checkout.amount_total !== record.amountMinor) throw new PaymentError('SUBSCRIPTION_CHECKOUT_MISMATCH', 502);
  await client.$transaction(async tx => {
    await paymentLock(tx, `premium:${record.id}`);
    const current = await tx.premiumSubscription.findUniqueOrThrow({ where: { id: record.id } });
    if (current.checkoutSessionId && current.checkoutSessionId !== checkout.id) throw new PaymentError('CHECKOUT_IDEMPOTENCY_CONFLICT', 409);
    await tx.premiumSubscription.update({ where: { id: record.id }, data: { checkoutSessionId: checkout.id, checkoutUrl, ...(current.providerStatus === 'creating' ? { providerStatus: 'checkout' } : {}) } });
    await paymentAudit(tx, 'premium.checkout.created', record.id, user.id);
  });
  return { subscriptionId: record.id, checkoutUrl };
}

async function readInvoice(provider, record, invoiceId, customerId) {
  const invoice = await provider.invoice(invoiceId);
  let payments = null, intent = null;
  if (invoice.status === 'paid') {
    payments = await provider.invoicePayments(invoice.id);
    const paid = payments.data?.filter(p => p.status === 'paid');
    if (payments.has_more || paid?.length !== 1 || paid[0].payment?.type !== 'payment_intent') throw new PaymentError('INVOICE_PAYMENT_REQUIRES_REVIEW', 409);
    intent = await provider.paymentIntent(providerId(paid[0].payment.payment_intent));
  }
  return invoiceSnapshot(record, invoice, payments, intent, customerId);
}

async function saveInvoice(tx, record, snapshot, provider) {
  const existing = await tx.billingInvoice.findUnique({ where: { providerInvoiceId: snapshot.providerInvoiceId }, include: { refund: true } });
  if (existing && (existing.subscriptionId !== record.id || existing.paymentIntentId && snapshot.paymentIntentId && existing.paymentIntentId !== snapshot.paymentIntentId)) throw new PaymentError('INVOICE_OWNERSHIP_MISMATCH', 409);
  const data = { ...snapshot, refundedMinor: Math.max(existing?.refundedMinor || 0, snapshot.refundedMinor), riskHold: Boolean(existing?.riskHold || snapshot.riskHold), paymentIntentId: snapshot.paymentIntentId || existing?.paymentIntentId || null, paidAt: snapshot.paidAt || existing?.paidAt || null };
  const invoice = await tx.billingInvoice.upsert({ where: { providerInvoiceId: snapshot.providerInvoiceId }, create: { subscriptionId: record.id, ...data }, update: data });
  if (existing?.refund?.providerRefundId) {
    const refund = await provider.refundById(existing.refund.providerRefundId);
    if (refund.payment_intent !== invoice.paymentIntentId || refund.currency !== invoice.currency || refund.amount !== invoice.amountMinor) throw new PaymentError('INVOICE_REFUND_MISMATCH', 409);
    await tx.billingInvoiceRefund.update({ where: { invoiceId: invoice.id }, data: { status: reconciledRefundStatus(existing.refund.status, refund.status) } });
  }
  return invoice;
}

// Serialize canonical reads as well as writes, so a late worker cannot restore stale access.
// Network reads are bounded by the provider client; DB timeout must match deployment limits.
export async function syncPremiumSubscription(client, recordId, config, event = null, actor = null, provider = stripeClient(config)) {
  return client.$transaction(async tx => {
    await paymentLock(tx, `premium:${recordId}`);
    if (event && await tx.premiumBillingEvent.findUnique({ where: { eventId: event.id } })) return { duplicate: true };
    let record = await tx.premiumSubscription.findUniqueOrThrow({ where: { id: recordId }, include: { account: true } });
    if (record.live !== config.live || !record.checkoutSessionId) throw new PaymentError('PREMIUM_CHECKOUT_NOT_READY', 503);
    const checkout = await provider.checkout(record.checkoutSessionId);
    if (checkout.object !== 'checkout.session' || checkout.mode !== 'subscription' || checkout.id !== record.checkoutSessionId || checkout.livemode !== record.live || checkout.client_reference_id !== record.id || checkout.metadata?.premiumSubscriptionId !== record.id || providerId(checkout.customer) !== record.account.providerCustomerId) throw new PaymentError('PREMIUM_CHECKOUT_RECONCILIATION_MISMATCH', 409);
    const providerSubscriptionId = providerId(checkout.subscription);
    if (!providerSubscriptionId) {
      if (checkout.status === 'expired') await tx.premiumSubscription.update({ where: { id: record.id }, data: { providerStatus: 'expired', activeSlot: null, accessUntil: null, lastReconciledAt: new Date() } });
      if (event) await tx.premiumBillingEvent.create({ data: { eventId: event.id, subscriptionId: record.id, eventType: event.type, bodyHash: event.bodyHash } });
      await paymentAudit(tx, 'premium.checkout.reconciled', record.id, actor);
      return { subscriptionId: record.id, status: checkout.status, accessUntil: null };
    }
    if (checkout.consent?.terms_of_service !== 'accepted' || record.providerSubscriptionId && record.providerSubscriptionId !== providerSubscriptionId) throw new PaymentError('SUBSCRIPTION_ID_OR_CONSENT_MISMATCH', 409);
    record = { ...record, providerSubscriptionId };
    const subscription = await provider.subscription(providerSubscriptionId);
    const item = checkedSubscription(record, subscription, record.account.providerCustomerId);
    const latestId = providerId(subscription.latest_invoice);
    let currentInvoice = null;
    if (latestId) currentInvoice = await saveInvoice(tx, record, await readInvoice(provider, record, latestId, record.account.providerCustomerId), provider);
    if (event?.invoiceId && event.invoiceId !== latestId) await saveInvoice(tx, record, await readInvoice(provider, record, event.invoiceId, record.account.providerCustomerId), provider);
    const riskHold = record.riskHold || currentInvoice?.riskHold || event?.type === 'charge.dispute.created';
    const refundRequest = currentInvoice ? await tx.billingInvoiceRefund.findUnique({ where: { invoiceId: currentInvoice.id } }) : null;
    const paidCurrent = !refundRequest && currentInvoice?.status === 'paid' && currentInvoice.paymentIntentId && currentInvoice.refundedMinor === 0 && !currentInvoice.riskHold && currentInvoice.periodStart?.getTime() === item.current_period_start * 1000 && currentInvoice.periodEnd?.getTime() === item.current_period_end * 1000;
    const accessUntil = subscription.status === 'active' && !subscription.pause_collection && !riskHold && paidCurrent ? currentInvoice.periodEnd : null;
    const now = new Date();
    await tx.premiumSubscription.update({ where: { id: record.id }, data: { providerSubscriptionId, providerStatus: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end === true, currentPeriodEnd: new Date(item.current_period_end * 1000), currentInvoiceId: latestId, accessUntil, riskHold: Boolean(riskHold), lastReconciledAt: now, ...(terminal.has(subscription.status) ? { activeSlot: null } : {}) } });
    if (event) await tx.premiumBillingEvent.create({ data: { eventId: event.id, subscriptionId: record.id, eventType: event.type, bodyHash: event.bodyHash } });
    await paymentAudit(tx, event ? 'premium.webhook.reconciled' : 'premium.subscription.reconciled', record.id, actor);
    return { subscriptionId: record.id, status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end === true, currentPeriodEnd: new Date(item.current_period_end * 1000).toISOString(), accessUntil: accessUntil?.toISOString() || null };
  }, { maxWait: 5000, timeout: 90000 });
}

export async function handlePremiumWebhook(client, event, config, bodyHash) {
  const object = event.data.object;
  let record = null, invoiceId = null;
  if (event.type.startsWith('checkout.session.') && object.mode === 'subscription') {
    record = await client.premiumSubscription.findUnique({ where: { checkoutSessionId: object.id } });
    if (!record) throw new PaymentError('PREMIUM_CHECKOUT_NOT_READY', 503);
  } else if (event.type.startsWith('customer.subscription.')) {
    record = await client.premiumSubscription.findUnique({ where: { providerSubscriptionId: object.id } });
    if (!record && object.metadata?.premiumSubscriptionId) record = await client.premiumSubscription.findUnique({ where: { id: object.metadata.premiumSubscriptionId } });
    if (!record) return { ignored: true };
  } else if (event.type.startsWith('invoice.')) {
    invoiceId = object.id;
    const invoice = await stripeClient(config).invoice(invoiceId);
    const subscriptionId = providerId(invoice.parent?.subscription_details?.subscription);
    if (!subscriptionId) return { ignored: true };
    record = await client.premiumSubscription.findUnique({ where: { providerSubscriptionId: subscriptionId } });
    if (!record) {
      const subscription = await stripeClient(config).subscription(subscriptionId);
      if (subscription.metadata?.premiumSubscriptionId) record = await client.premiumSubscription.findUnique({ where: { id: subscription.metadata.premiumSubscriptionId } });
    }
    if (!record) return { ignored: true };
  } else if (['charge.refunded', 'charge.dispute.created', 'refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) {
    const paymentIntentId = providerId(object.payment_intent);
    if (!paymentIntentId) return null;
    const invoice = await client.billingInvoice.findUnique({ where: { paymentIntentId } });
    if (!invoice) return null; // Earlier invoice/checkout delivery or a one-time merchant order.
    invoiceId = invoice.providerInvoiceId;
    record = await client.premiumSubscription.findUnique({ where: { id: invoice.subscriptionId } });
  } else return null;
  if (!record) return null;
  try { return await syncPremiumSubscription(client, record.id, config, { id: event.id, type: event.type, bodyHash, invoiceId }); }
  catch (error) {
    await client.$transaction(async tx => { await paymentLock(tx, `premium:${record.id}`); await tx.premiumSubscription.update({ where: { id: record.id }, data: { accessUntil: null } }); await paymentAudit(tx, 'premium.webhook.requires-review', record.id); });
    throw error;
  }
}

export async function premiumBillingSummary(request) {
  const client = await paymentDb();
  const user = await billingIdentity(request, client);
  const config = paymentConfiguration(process.env, { existingBilling: true });
  const records = await client.premiumSubscription.findMany({ where: { userId: user.id, live: config.live }, orderBy: { createdAt: 'desc' }, take: 20, include: { invoices: { orderBy: { createdAt: 'desc' }, take: 24 } } });
  return { mode: config.mode, subscriptions: records.map(record => ({ id: record.id, status: record.providerStatus, cancelAtPeriodEnd: record.cancelAtPeriodEnd, currentPeriodEnd: record.currentPeriodEnd, interval: record.interval, intervalCount: record.intervalCount, amountMinor: record.amountMinor, currency: record.currency, accessUntil: record.accessUntil, access: premiumAccess(record, record.invoices.find(invoice => invoice.providerInvoiceId === record.currentInvoiceId), Date.now(), config.live), invoices: record.invoices.map(invoice => ({ id: invoice.id, amountMinor: invoice.amountMinor, currency: invoice.currency, status: invoice.status, refundedMinor: invoice.refundedMinor, riskHold: invoice.riskHold, receiptUrl: invoice.receiptUrl, hostedInvoiceUrl: invoice.hostedInvoiceUrl, paidAt: invoice.paidAt, periodEnd: invoice.periodEnd })) })) };
}

export async function refreshPremiumSubscription(request) {
  const client = await paymentDb();
  const user = await billingIdentity(request, client, true);
  const { subscriptionId } = await readBillingBody(request);
  if (typeof subscriptionId !== 'string') throw new PaymentError('SUBSCRIPTION_ID_REQUIRED');
  const record = await client.premiumSubscription.findFirst({ where: { id: subscriptionId, userId: user.id } });
  if (!record) throw new PaymentError('SUBSCRIPTION_NOT_FOUND', 404);
  return syncPremiumSubscription(client, record.id, paymentConfiguration(process.env, { existingBilling: true }), null, user.id);
}

export async function cancelPremiumRecord(client, record, config, userId, provider = stripeClient(config)) {
  if (record.userId !== userId || record.live !== config.live || !record.providerSubscriptionId || !record.account?.providerCustomerId) throw new PaymentError('SUBSCRIPTION_NOT_FOUND', 404);
  const before = await provider.subscription(record.providerSubscriptionId);
  checkedSubscription(record, before, record.account.providerCustomerId);
  await client.$transaction(async tx => {
    await paymentLock(tx, `premium:${record.id}`);
    await tx.premiumSubscription.update({ where: { id: record.id }, data: { cancellationRequestedAt: record.cancellationRequestedAt || new Date() } });
    await paymentAudit(tx, 'premium.cancellation.requested', record.id, userId);
  });
  if (!terminal.has(before.status) && !before.cancel_at_period_end) {
    const response = await provider.cancelSubscriptionAtPeriodEnd(record.providerSubscriptionId);
    checkedSubscription(record, response, record.account.providerCustomerId);
    if (!response.cancel_at_period_end && !terminal.has(response.status)) throw new PaymentError('CANCELLATION_NOT_CONFIRMED', 502);
  }
  const confirmed = await syncPremiumSubscription(client, record.id, config, null, userId, provider);
  if (!confirmed.cancelAtPeriodEnd && !terminal.has(confirmed.status)) throw new PaymentError('CANCELLATION_NOT_CONFIRMED', 502);
  await client.$transaction(tx => paymentAudit(tx, 'premium.cancellation.confirmed', record.id, userId));
  return { subscriptionId: record.id, cancellationConfirmed: true, noFurtherRenewals: true, effectiveAt: confirmed.currentPeriodEnd, accessUntil: confirmed.accessUntil };
}

export async function cancelPremiumSubscription(request) {
  const client = await paymentDb();
  const user = await billingIdentity(request, client, true);
  const { subscriptionId } = await readBillingBody(request);
  if (typeof subscriptionId !== 'string') throw new PaymentError('SUBSCRIPTION_ID_REQUIRED');
  const config = paymentConfiguration(process.env, { existingBilling: true });
  const record = await client.premiumSubscription.findFirst({ where: { id: subscriptionId, userId: user.id, live: config.live }, include: { account: true } });
  if (!record) throw new PaymentError('SUBSCRIPTION_NOT_FOUND', 404);
  return cancelPremiumRecord(client, record, config, user.id);
}

export async function createBillingPortal(request) {
  const client = await paymentDb();
  const user = await billingIdentity(request, client, true);
  const config = paymentConfiguration(process.env, { existingBilling: true });
  const account = await client.billingAccount.findUnique({ where: { userId_live: { userId: user.id, live: config.live } } });
  if (!account?.providerCustomerId) throw new PaymentError('BILLING_ACCOUNT_NOT_FOUND', 404);
  const provider = stripeClient(config);
  const portalConfig = await provider.portalConfiguration();
  if (!portalConfig.active || portalConfig.livemode !== config.live || portalConfig.features?.subscription_update?.enabled || portalConfig.features?.subscription_cancel?.enabled !== true || portalConfig.features.subscription_cancel.mode !== 'at_period_end' || portalConfig.features?.payment_method_update?.enabled !== true || portalConfig.features?.invoice_history?.enabled !== true) throw new PaymentError('BILLING_PORTAL_CONFIGURATION_REQUIRES_REVIEW', 503);
  const session = await provider.portal(account.providerCustomerId, `sf-portal-${randomUUID()}`);
  const url = stripeLink(session.url, 'billing.stripe.com');
  if (!url || session.customer !== account.providerCustomerId || session.livemode !== config.live || session.configuration !== portalConfig.id) throw new PaymentError('BILLING_PORTAL_MISMATCH', 502);
  await client.$transaction(tx => paymentAudit(tx, 'premium.portal.created', account.id, user.id));
  return { url };
}

export async function refundPremiumInvoice(request) {
  const client = await paymentDb();
  const staff = await billingIdentity(request, client, true, true);
  const config = paymentConfiguration(process.env, { existingBilling: true });
  const { invoiceId, reason } = await readBillingBody(request);
  if (typeof invoiceId !== 'string' || !['CUSTOMER_REQUEST', 'DUPLICATE', 'SERVICE_CANCELLED'].includes(reason)) throw new PaymentError('REFUND_INPUT_INVALID');
  let invoice = await client.billingInvoice.findUnique({ where: { id: invoiceId }, include: { subscription: true } });
  if (!invoice || invoice.subscription.live !== config.live) throw new PaymentError('INVOICE_NOT_FOUND', 404);
  await syncPremiumSubscription(client, invoice.subscriptionId, config, { id: `manual_${randomUUID()}`, type: 'refund.preflight', bodyHash: hash(invoiceId), invoiceId: invoice.providerInvoiceId }, staff.id);
  const reservation = await client.$transaction(async tx => {
    await paymentLock(tx, `premium:${invoice.subscriptionId}`);
    const existing = await tx.billingInvoiceRefund.findUnique({ where: { invoiceId } });
    if (existing) return existing;
    const current = await tx.billingInvoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { subscription: true } });
    if (current.status !== 'paid' || !current.paymentIntentId || current.refundedMinor || current.riskHold || current.subscription.riskHold) throw new PaymentError('INVOICE_REFUND_REQUIRES_REVIEW', 409);
    const created = await tx.billingInvoiceRefund.create({ data: { invoiceId, requestedBy: staff.id, reason } });
    // Conservatively suspend current-period access while a refund is unresolved.
    if (current.subscription.currentInvoiceId === current.providerInvoiceId) await tx.premiumSubscription.update({ where: { id: current.subscriptionId }, data: { accessUntil: null } });
    await paymentAudit(tx, 'premium.invoice.refund.requested', invoiceId, staff.id);
    return created;
  });
  if (reservation.status !== 'REQUESTED') return { refundId: reservation.id, status: reservation.status };
  if (retryExpired(reservation)) throw new PaymentError('REFUND_REQUIRES_MANUAL_RECONCILIATION', 409);
  invoice = await client.billingInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const result = await stripeClient(config).refundInvoice(invoice);
  if (result.payment_intent !== invoice.paymentIntentId || result.amount !== invoice.amountMinor || result.currency !== invoice.currency || result.object !== 'refund') throw new PaymentError('INVOICE_REFUND_MISMATCH', 502);
  await client.$transaction(async tx => {
    await paymentLock(tx, `premium:${invoice.subscriptionId}`);
    const current = await tx.billingInvoiceRefund.findUniqueOrThrow({ where: { invoiceId } });
    await tx.billingInvoiceRefund.update({ where: { invoiceId }, data: { providerRefundId: result.id, status: reconciledRefundStatus(current.status, result.status) } });
    await paymentAudit(tx, 'premium.invoice.refund.submitted', invoiceId, staff.id);
  });
  await syncPremiumSubscription(client, invoice.subscriptionId, config, { id: `manual_${randomUUID()}`, type: 'refund.reconcile', bodyHash: hash(invoiceId), invoiceId: invoice.providerInvoiceId }, staff.id);
  return { refundId: reservation.id, status: result.status };
}

export async function requirePremiumAccess(request) {
  const client = await paymentDb();
  const user = await billingIdentity(request, client);
  const config = paymentConfiguration(process.env, { existingBilling: true });
  const records = await client.premiumSubscription.findMany({ where: { userId: user.id, live: config.live, productCode: PREMIUM_PRODUCT_CODE, providerStatus: 'active' } });
  for (const record of records) {
    const invoice = record.currentInvoiceId ? await client.billingInvoice.findUnique({ where: { providerInvoiceId: record.currentInvoiceId } }) : null;
    const access = premiumAccess(record, invoice, Date.now(), config.live);
    if (access.allowed) return { userId: user.id, ...access };
  }
  throw new PaymentError('PREMIUM_ACCESS_REQUIRED', 403);
}

export async function reconcilePremiumBatch() {
  const client = await paymentDb();
  const config = paymentConfiguration(process.env, { existingBilling: true });
  const records = await client.premiumSubscription.findMany({ where: { live: config.live, checkoutSessionId: { not: null }, activeSlot: { not: null } }, orderBy: { lastReconciledAt: { sort: 'asc', nulls: 'first' } }, take: 100 });
  const results = [];
  for (const record of records) {
    try { results.push(await syncPremiumSubscription(client, record.id, config)); }
    catch (error) {
      // Revoke stale access on an unverified provider state instead of retaining it.
      await client.$transaction(async tx => { await paymentLock(tx, `premium:${record.id}`); await tx.premiumSubscription.update({ where: { id: record.id }, data: { accessUntil: null } }); await paymentAudit(tx, 'premium.reconciliation.requires-review', record.id); });
      results.push({ subscriptionId: record.id, error: error instanceof PaymentError ? error.code : 'PREMIUM_RECONCILIATION_FAILED' });
    }
  }
  return results;
}
