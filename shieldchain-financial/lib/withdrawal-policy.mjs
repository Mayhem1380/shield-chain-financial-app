/**
 * Provider-neutral withdrawal policy primitives for tests and future server integration.
 * This module does not create, approve, queue, or execute a withdrawal and is not wired
 * to any route, database, custody, banking, or payment provider.
 */

const requiredTrueChecks = [
  ['authenticatedSession', 'SESSION_NOT_VERIFIED'],
  ['emailVerified', 'EMAIL_NOT_VERIFIED'],
  ['accountActive', 'ACCOUNT_NOT_ACTIVE'],
  ['kycApproved', 'KYC_NOT_APPROVED'],
  ['kycCurrent', 'KYC_EXPIRED_OR_UNKNOWN'],
  ['beneficiaryNameMatch', 'BENEFICIARY_MISMATCH_OR_UNKNOWN'],
  ['destinationVerified', 'DESTINATION_NOT_VERIFIED'],
  ['riskReviewPassed', 'RISK_REVIEW_NOT_PASSED'],
  ['balanceAndLimitsPassed', 'BALANCE_OR_LIMIT_CHECK_FAILED'],
  ['assetAndNetworkSupported', 'ASSET_OR_NETWORK_UNSUPPORTED'],
  ['noProtectiveHold', 'PROTECTIVE_HOLD_PRESENT_OR_UNKNOWN'],
];

const allowedTransitions = {
  REQUESTED: new Set(['IDENTITY_CHECK', 'CANCELLED']),
  IDENTITY_CHECK: new Set(['RISK_REVIEW', 'REJECTED', 'CANCELLED']),
  RISK_REVIEW: new Set(['APPROVED', 'REJECTED', 'CANCELLED']),
  APPROVED: new Set(['PROCESSING', 'CANCELLED']),
  PROCESSING: new Set(['PAID', 'REJECTED']),
  PAID: new Set(),
  REJECTED: new Set(),
  CANCELLED: new Set(),
};

/** Fail closed: only literal `true` satisfies a required control. */
export function evaluateWithdrawalApproval(input, { now = new Date() } = {}) {
  const reasons = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { allowed: false, reasons: ['INVALID_OR_MISSING_INPUT'] };
  }

  for (const [field, reason] of requiredTrueChecks) {
    if (input[field] !== true) reasons.push(reason);
  }

  if (typeof input.amount !== 'string' || !/^\d+(?:\.\d{1,8})?$/.test(input.amount)) {
    reasons.push('AMOUNT_FORMAT_INVALID');
  } else if (!/[1-9]/.test(input.amount)) {
    reasons.push('AMOUNT_MUST_BE_POSITIVE');
  }

  if (typeof input.assetCode !== 'string' || !/^[A-Z0-9]{2,20}$/.test(input.assetCode)) {
    reasons.push('ASSET_CODE_INVALID');
  }

  if (!(input.kycExpiresAt instanceof Date) || Number.isNaN(input.kycExpiresAt.getTime())) {
    reasons.push('KYC_EXPIRY_MISSING_OR_INVALID');
  } else if (!(now instanceof Date) || Number.isNaN(now.getTime()) || input.kycExpiresAt <= now) {
    reasons.push('KYC_EXPIRED_OR_CLOCK_INVALID');
  }

  return { allowed: reasons.length === 0, reasons };
}

/** Check a proposed status change without mutating state or performing side effects. */
export function canTransitionWithdrawal(from, to) {
  if (typeof from !== 'string' || typeof to !== 'string') return false;
  return allowedTransitions[from]?.has(to) ?? false;
}

export function getAllowedWithdrawalTransitions(from) {
  return [...(allowedTransitions[from] ?? new Set())];
}
