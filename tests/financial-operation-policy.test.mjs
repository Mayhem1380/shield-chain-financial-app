import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFinancialOperation, evaluateFinancialStateChange } from '../lib/financial-operation-policy.mjs';
const valid = { serverAuthorized: true, accountStatus: 'ACTIVE', stepUpVerified: true, idempotencyKey: 'operation_key_123456', idempotencyState: 'NEW', currency: 'AUD', amount: '25.50', reviewedQuote: true, riskChecksPassed: true };
test('live financial capability remains denied by default', () => assert.equal(evaluateFinancialOperation(valid).code, 'LIVE_CAPABILITY_DISABLED'));
test('admits only fully reviewed request when capability explicitly enabled', () => assert.equal(evaluateFinancialOperation(valid, { liveCapabilityEnabled: true }).allowed, true));
test('requires server-side authorization', () => assert.equal(evaluateFinancialOperation({ ...valid, serverAuthorized: false }, { liveCapabilityEnabled: true }).code, 'SERVER_AUTHORIZATION_REQUIRED'));
test('requires active account and step-up verification', () => {
  assert.equal(evaluateFinancialOperation({ ...valid, accountStatus: 'SUSPENDED' }, { liveCapabilityEnabled: true }).code, 'ACCOUNT_NOT_ACTIVE');
  assert.equal(evaluateFinancialOperation({ ...valid, stepUpVerified: false }, { liveCapabilityEnabled: true }).code, 'STEP_UP_VERIFICATION_REQUIRED');
});
test('rejects malformed and duplicate idempotency keys', () => {
  assert.equal(evaluateFinancialOperation({ ...valid, idempotencyKey: 'short' }, { liveCapabilityEnabled: true }).code, 'IDEMPOTENCY_KEY_INVALID');
  assert.equal(evaluateFinancialOperation({ ...valid, idempotencyState: 'EXISTS' }, { liveCapabilityEnabled: true }).code, 'DUPLICATE_OPERATION');
});
test('fails closed when idempotency state is unknown', () => assert.equal(evaluateFinancialOperation({ ...valid, idempotencyState: undefined }, { liveCapabilityEnabled: true }).code, 'IDEMPOTENCY_STATE_UNKNOWN'));
test('rejects unsupported currency and malformed amount strings', () => {
  assert.equal(evaluateFinancialOperation({ ...valid, currency: 'XYZ' }, { liveCapabilityEnabled: true }).code, 'CURRENCY_NOT_SUPPORTED');
  for (const amount of ['-1', '1e6', 'NaN', '01.2', '1.123456789', '999999999999999999999999']) assert.equal(evaluateFinancialOperation({ ...valid, amount }, { liveCapabilityEnabled: true }).allowed, false, amount);
});
test('rejects zero amounts and requires quote and risk review', () => {
  assert.equal(evaluateFinancialOperation({ ...valid, amount: '0.00' }, { liveCapabilityEnabled: true }).code, 'AMOUNT_MUST_BE_POSITIVE');
  assert.equal(evaluateFinancialOperation({ ...valid, reviewedQuote: false }, { liveCapabilityEnabled: true }).code, 'REVIEWED_QUOTE_REQUIRED');
  assert.equal(evaluateFinancialOperation({ ...valid, riskChecksPassed: false }, { liveCapabilityEnabled: true }).code, 'RISK_CHECKS_REQUIRED');
});
test('state change requires every atomic server-side prerequisite', () => assert.equal(evaluateFinancialStateChange({ operationAdmitted: true }).code, 'STATE_CHANGE_PREREQUISITES_MISSING'));
test('state change admitted only with ledger, audit, authorization and atomic idempotency', () => {
  const complete = { operationAdmitted: true, idempotencyClaimedAtomically: true, accountLoadedServerSide: true, limitsCheckedServerSide: true, ledgerWriteAtomic: true, auditEventPersisted: true, transitionAllowed: true };
  assert.equal(evaluateFinancialStateChange(complete).allowed, true);
  assert.equal(evaluateFinancialStateChange({ ...complete, transitionAllowed: false }).code, 'STATE_TRANSITION_DENIED');
});
