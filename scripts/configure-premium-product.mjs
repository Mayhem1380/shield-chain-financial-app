import { paymentConfiguration, stripeClient } from '../lib/payments/stripe.mjs';
import { PREMIUM_PRODUCT_CODE, PREMIUM_TITLE, assertRecurringPrice } from '../lib/payments/premium-policy.mjs';

// Imports an existing provider Price. Never creates a Price, invents an amount, or enables sales.
const priceId = process.argv[2];
if (!/^price_[A-Za-z0-9]+$/.test(priceId || '')) {
  console.error('Usage: node scripts/configure-premium-product.mjs price_ID. Imports an existing AUD recurring Price as DISABLED; no approval is asserted.');
  process.exitCode = 1;
} else {
  try {
    const config = paymentConfiguration();
    const price = await stripeClient(config).price(priceId);
    const data = { title: PREMIUM_TITLE, purpose: 'SOFTWARE_ACCESS', billingMode: 'SUBSCRIPTION', priceId, amountMinor: price.unit_amount, currency: price.currency, interval: price.recurring?.interval, intervalCount: price.recurring?.interval_count, live: config.live, enabled: false, providerApprovalReference: null, legalApprovalReference: null, approvedUntil: null, termsVersion: null };
    if (data.currency !== 'aud' || !price.active || !Number.isSafeInteger(data.amountMinor) || data.amountMinor < 50 || data.amountMinor > 100000 || !['month', 'year'].includes(data.interval) || !Number.isSafeInteger(data.intervalCount) || data.intervalCount < 1 || data.intervalCount > 12) throw Error('Unsupported price');
    assertRecurringPrice(data, price);
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient();
    try {
      await client.$transaction(async tx => {
        await tx.paymentProduct.upsert({ where: { code: PREMIUM_PRODUCT_CODE }, create: { code: PREMIUM_PRODUCT_CODE, ...data }, update: data });
        await tx.auditEvent.create({ data: { action: 'premium.product.imported-disabled', resource: 'payment-product', resourceId: PREMIUM_PRODUCT_CODE } });
      });
      console.log('Imported provider price as disabled. Approval references, terms and expiry are intentionally unset.');
    } finally { await client.$disconnect(); }
  } catch {
    console.error('Price import failed. Check approved credentials, provider Price and reviewed DB schema. No price or merchant approval was invented.');
    process.exitCode = 1;
  }
}
