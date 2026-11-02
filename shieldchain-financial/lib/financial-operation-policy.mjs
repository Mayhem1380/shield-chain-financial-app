/** Admission rules for future financial requests. This module never executes, prices, persists, or settles a transaction. */
const deny = (code) => ({ allowed: false, code });
const supportedCurrencies = new Set(['AUD', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDC']);

export function evaluateFinancialOperation(input, { liveCapabilityEnabled = false, maxAmountDigits = 24 } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('OPERATION_CONTEXT_INVALID');
  if (liveCapabilityEnabled !== true) return deny('LIVE_CAPABILITY_DISABLED');
  if (input.serverAuthorized !== true) return deny('SERVER_AUTHORIZATION_REQUIRED');
  if (input.accountStatus !== 'ACTIVE') return deny('ACCOUNT_NOT_ACTIVE');
  if (input.stepUpVerified !== true) return deny('STEP_UP_VERIFICATION_REQUIRED');
  if (typeof input.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(input.idempotencyKey)) return deny('IDEMPOTENCY_KEY_INVALID');
  if (input.idempotencyState !== 'NEW') return deny(input.idempotencyState === 'EXISTS' ? 'DUPLICATE_OPERATION' : 'IDEMPOTENCY_STATE_UNKNOWN');
  if (!supportedCurrencies.has(input.currency)) return deny('CURRENCY_NOT_SUPPORTED');
  if (typeof input.amount !== 'string' || input.amount.length > maxAmountDigits + 2 || !/^(?:0|[1-9]\d{0,21})(?:\.\d{1,8})?$/.test(input.amount)) return deny('AMOUNT_FORMAT_INVALID');
  if (!/[1-9]/.test(input.amount)) return deny('AMOUNT_MUST_BE_POSITIVE');
  if (input.reviewedQuote !== true) return deny('REVIEWED_QUOTE_REQUIRED');
  if (input.riskChecksPassed !== true) return deny('RISK_CHECKS_REQUIRED');
  return { allowed: true, code: 'OPERATION_ADMITTED_FOR_ATOMIC_SERVER_PROCESSING', idempotencyKey: input.idempotencyKey, currency: input.currency, amount: input.amount };
}

export function evaluateFinancialStateChange(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('STATE_CHANGE_CONTEXT_INVALID');
  const required = ['operationAdmitted', 'idempotencyClaimedAtomically', 'accountLoadedServerSide', 'limitsCheckedServerSide', 'ledgerWriteAtomic', 'auditEventPersisted'];
  if (required.some((field) => input[field] !== true)) return deny('STATE_CHANGE_PREREQUISITES_MISSING');
  if (input.transitionAllowed !== true) return deny('STATE_TRANSITION_DENIED');
  return { allowed: true, code: 'STATE_CHANGE_POLICY_ALLOWED' };
}
