/**
 * Strict contract for adapting a trusted identity provider into SF's authorization layer.
 * This validates normalized server-side claims; it does not verify cookies, JWTs, or signatures.
 */
const allowedRoles = new Set(['customer', 'support', 'reviewer', 'administrator']);
const allowedStatuses = new Set(['ACTIVE', 'PENDING', 'RESTRICTED', 'CLOSED']);

export function validateVerifiedSession(candidate, { now = Date.now() } = {}) {
  const deny = (code) => ({ valid: false, code });
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return deny('SESSION_SHAPE_INVALID');
  if (candidate.valid !== true) return deny('SESSION_NOT_VERIFIED');
  if (typeof candidate.sessionId !== 'string' || !candidate.sessionId.trim()) return deny('SESSION_ID_REQUIRED');
  if (typeof candidate.userId !== 'string' || !candidate.userId.trim()) return deny('USER_ID_REQUIRED');
  if (!allowedRoles.has(candidate.role)) return deny('ROLE_INVALID');
  if (!allowedStatuses.has(candidate.accountStatus)) return deny('ACCOUNT_STATUS_INVALID');
  if (candidate.emailVerified !== true) return deny('EMAIL_NOT_VERIFIED');
  if (typeof candidate.mfaVerified !== 'boolean') return deny('MFA_STATE_REQUIRED');
  if (typeof candidate.expiresAt !== 'string' && typeof candidate.expiresAt !== 'number' && !(candidate.expiresAt instanceof Date)) return deny('SESSION_EXPIRY_REQUIRED');
  const expiresAt = new Date(candidate.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || !Number.isFinite(now) || expiresAt <= now) return deny('SESSION_EXPIRED_OR_CLOCK_INVALID');
  if (candidate.stepUpVerified !== undefined && typeof candidate.stepUpVerified !== 'boolean') return deny('STEP_UP_STATE_INVALID');

  return {
    valid: true,
    sessionId: candidate.sessionId,
    userId: candidate.userId,
    role: candidate.role,
    accountStatus: candidate.accountStatus,
    emailVerified: true,
    mfaVerified: candidate.mfaVerified,
    stepUpVerified: candidate.stepUpVerified === true,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
