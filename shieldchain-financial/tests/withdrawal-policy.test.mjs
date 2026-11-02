import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionWithdrawal,
  evaluateWithdrawalApproval,
  getAllowedWithdrawalTransitions,
} from '../lib/withdrawal-policy.mjs';

const now = new Date('2026-10-21T00:00:00.000Z');
const approvedInput = {
  authenticatedSession: true,
  emailVerified: true,
  accountActive: true,
  kycApproved: true,
  kycCurrent: true,
  beneficiaryNameMatch: true,
  destinationVerified: true,
  riskReviewPassed: true,
  balanceAndLimitsPassed: true,
  assetAndNetworkSupported: true,
  noProtectiveHold: true,
  amount: '125.00000000',
  assetCode: 'USDC',
  kycExpiresAt: new Date('2027-01-01T00:00:00.000Z'),
};

test('allows policy evaluation only when every required check is explicitly true', () => {
  assert.deepEqual(evaluateWithdrawalApproval(approvedInput, { now }), { allowed: true, reasons: [] });
});

test('fails closed for missing input and unknown check values', () => {
  assert.equal(evaluateWithdrawalApproval(null, { now }).allowed, false);
  const input = { ...approvedInput, beneficiaryNameMatch: undefined };
  const result = evaluateWithdrawalApproval(input, { now });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('BENEFICIARY_MISMATCH_OR_UNKNOWN'));
});

test('blocks a protective hold, failed identity checks and expired KYC', () => {
  const result = evaluateWithdrawalApproval({
    ...approvedInput,
    noProtectiveHold: false,
    kycExpiresAt: new Date('2026-10-20T23:59:59.000Z'),
  }, { now });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes('PROTECTIVE_HOLD_PRESENT_OR_UNKNOWN'));
  assert.ok(result.reasons.includes('KYC_EXPIRED_OR_CLOCK_INVALID'));
});

test('rejects malformed, zero and negative amounts without floating-point conversion', () => {
  for (const amount of ['0', '0.00000000', '-1', '1e3', '1.123456789', 'NaN']) {
    assert.equal(evaluateWithdrawalApproval({ ...approvedInput, amount }, { now }).allowed, false, amount);
  }
});

test('enforces an explicit transition graph and prevents reopening terminal states', () => {
  assert.equal(canTransitionWithdrawal('REQUESTED', 'IDENTITY_CHECK'), true);
  assert.equal(canTransitionWithdrawal('RISK_REVIEW', 'APPROVED'), true);
  assert.equal(canTransitionWithdrawal('REQUESTED', 'PAID'), false);
  assert.equal(canTransitionWithdrawal('PAID', 'PROCESSING'), false);
  assert.equal(canTransitionWithdrawal('REJECTED', 'APPROVED'), false);
  assert.equal(canTransitionWithdrawal('UNKNOWN', 'APPROVED'), false);
  assert.deepEqual(getAllowedWithdrawalTransitions('PAID'), []);
});
