import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationEnvironment, redactVerificationLog } from '../scripts/verify-production.mjs';
import { offlinePaymentReadiness } from '../scripts/payment-readiness.mjs';

test('verification cannot inherit a live charging mode or production database target', () => {
  const env = verificationEnvironment({ DATABASE_URL: 'postgresql://production.invalid/live', PAYMENTS_MODE: 'live', PAYMENTS_LIVE_ENABLED: 'true', HTTPS_PROXY: 'fixture-proxy', RUNTIME_AUTH_HEADER: 'fixture-header' });
  assert.equal(env.PAYMENTS_MODE, 'disabled'); assert.equal(env.PAYMENTS_LIVE_ENABLED, 'false');
  assert.equal(new URL(env.DATABASE_URL).hostname, '127.0.0.1');
  assert.equal(new URL(env.DATABASE_URL).pathname, '/shieldchain_validation');
  assert.equal(env.HTTPS_PROXY, 'fixture-proxy'); assert.equal(env.RUNTIME_AUTH_HEADER, 'fixture-header');
});
test('verification logs redact credential-shaped tokens and database passwords', () => {
  const output = redactVerificationLog('sk_live_fixtureOnly whsec_fixtureOnly ghp_fixtureOnly postgresql://user:password@localhost/test');
  assert.equal(output.includes('fixtureOnly'), false); assert.equal(output.includes('password'), false);
  assert.ok(output.includes('localhost/test'));
});
test('pricing approval and configured key names cannot masquerade as eligibility or activation', () => {
  const report = offlinePaymentReadiness({ STRIPE_SECRET_KEY: 'fixture-secret-value', DATABASE_URL: 'fixture-db-value' });
  assert.equal(report.ownerPricingApproved, true); assert.equal(report.amountMinor, 995);
  assert.equal(report.activationAuthorised, false); assert.equal(report.liveChargingOperational, false);
  assert.equal(report.merchantEligibility, 'UNVERIFIED'); assert.equal(report.premiumProductAcceptance, 'UNVERIFIED');
  assert.equal(JSON.stringify(report).includes('fixture-secret-value'), false);
  assert.equal(JSON.stringify(report).includes('fixture-db-value'), false);
});
