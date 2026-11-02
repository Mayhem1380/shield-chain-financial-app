import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PREMIUM_OFFER } from '../lib/premium-offer.mjs';
import { paymentConfiguration, stripeClient } from '../lib/payments/stripe.mjs';

export function offlinePaymentReadiness(env = process.env) {
  return {
    ownerPricingApproved: PREMIUM_OFFER.pricingStatus === 'APPROVED',
    amountMinor: PREMIUM_OFFER.amountMinor, currency: PREMIUM_OFFER.currency,
    interval: PREMIUM_OFFER.interval, intervalCount: PREMIUM_OFFER.intervalCount,
    activationAuthorised: PREMIUM_OFFER.activationStatus === 'AUTHORISED' && Boolean(PREMIUM_OFFER.ownerActivationReference),
    configuredNames: Object.fromEntries(['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PAYMENTS_ORIGIN', 'STRIPE_PORTAL_CONFIGURATION_ID'].map(name => [name, Boolean(env[name])])),
    merchantEligibility: 'UNVERIFIED', premiumProductAcceptance: 'UNVERIFIED',
    genuineTransaction: 'NOT_VERIFIED', liveChargingOperational: false,
  };
}

export async function checkPaymentReadiness({ provider = false } = {}) {
  const report = offlinePaymentReadiness();
  if (!provider) return report;
  try {
    const config = paymentConfiguration(process.env, { existingBilling: true });
    const account = await stripeClient(config).accountReadiness();
    report.providerAccount = {
      mode: config.mode, detailsSubmitted: account.details_submitted === true,
      chargesEnabled: account.charges_enabled === true, payoutsEnabled: account.payouts_enabled === true,
      requirementsDue: Array.isArray(account.requirements?.currently_due) ? account.requirements.currently_due.length : null,
    };
    // Enabled account capabilities do not establish acceptance of this specific product.
    report.premiumProductAcceptance = 'NOT_ESTABLISHED_BY_ACCOUNT_API';
  } catch { report.providerAccount = { verified: false, blocker: 'PROVIDER_CONFIGURATION_OR_ACCOUNT_CHECK_FAILED' }; }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await checkPaymentReadiness({ provider: process.argv.includes('--provider') }), null, 2));
}
