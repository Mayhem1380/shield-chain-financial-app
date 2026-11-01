/** Conservative retention classification defaults; legal/privacy owners must approve actual periods. */
const classes = new Set(['SECURITY_AUDIT', 'AUTH_SESSION', 'IDENTITY_EVIDENCE', 'SUPPORT_CONTENT', 'PRODUCT_ANALYTICS', 'FINANCIAL_RECORD']);
const deny = (code) => ({ allowed: false, code });
export function evaluateRetentionAction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('RETENTION_CONTEXT_INVALID');
  if (!classes.has(input.dataClass)) return deny('DATA_CLASS_INVALID');
  if (typeof input.recordId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.recordId)) return deny('RECORD_ID_INVALID');
  if (!Number.isFinite(input.createdAt) || !Number.isFinite(input.now) || input.createdAt > input.now) return deny('RETENTION_CLOCK_INVALID');
  if (typeof input.retentionDays !== 'number' || !Number.isInteger(input.retentionDays) || input.retentionDays < 1 || input.retentionDays > 36500) return deny('RETENTION_PERIOD_INVALID');
  if (input.legalHold !== false && input.legalHold !== true) return deny('LEGAL_HOLD_STATE_REQUIRED');
  if (input.legalHold) return { allowed: false, code: 'LEGAL_HOLD_ACTIVE', action: 'PRESERVE_AND_ESCALATE' };
  if (input.deletionRequested === true && input.dataClass === 'FINANCIAL_RECORD') return { allowed: false, code: 'REVIEW_STATUTORY_RETENTION', action: 'PRIVACY_REVIEW_REQUIRED' };
  const ageMs = input.now - input.createdAt;
  const limitMs = input.retentionDays * 24 * 60 * 60 * 1000;
  if (ageMs < limitMs) return { allowed: true, code: 'RETENTION_PERIOD_NOT_REACHED', action: 'KEEP', ageMs, limitMs };
  if (input.dataClass === 'IDENTITY_EVIDENCE' || input.dataClass === 'FINANCIAL_RECORD') return { allowed: false, code: 'RESTRICTED_CLASS_REVIEW_REQUIRED', action: 'PRIVACY_COMPLIANCE_REVIEW' };
  return { allowed: true, code: 'RETENTION_PERIOD_REACHED', action: 'ELIGIBLE_FOR_REVIEWED_DELETION', ageMs, limitMs };
}
