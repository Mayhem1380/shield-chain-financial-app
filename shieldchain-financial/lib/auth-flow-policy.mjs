/**
 * Provider-neutral policy decisions for future authentication flows.
 * This module does not verify passwords/tokens, persist counters, send email,
 * create sessions, or authenticate a user. Those operations belong to a trusted
 * identity provider and server-side persistence layer.
 */
const activeStatuses = new Set(['ACTIVE']);
const validStatuses = new Set(['ACTIVE', 'PENDING', 'RESTRICTED', 'CLOSED']);

const deny = (code) => ({ allowed: false, code });

export const PASSWORD_RESET_PUBLIC_RESPONSE =
  'If an account matches those details, instructions will be sent shortly.';

/** Evaluate normalized claims only after the trusted provider verifies credentials. */
export function evaluateSignInPolicy(input, { now = Date.now(), maxFailedAttempts = 10 } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('SIGN_IN_CONTEXT_INVALID');
  if (input.providerVerified !== true) return deny('CREDENTIALS_NOT_VERIFIED');
  if (typeof input.userId !== 'string' || !input.userId.trim()) return deny('USER_ID_REQUIRED');
  if (!validStatuses.has(input.accountStatus)) return deny('ACCOUNT_STATUS_INVALID');
  if (!activeStatuses.has(input.accountStatus)) return deny('ACCOUNT_NOT_ACTIVE');
  if (input.emailVerified !== true) return deny('EMAIL_NOT_VERIFIED');
  if (!Number.isSafeInteger(input.failedAttempts) || input.failedAttempts < 0) return deny('FAILED_ATTEMPT_STATE_INVALID');
  if (!Number.isSafeInteger(maxFailedAttempts) || maxFailedAttempts < 1) return deny('LOCKOUT_POLICY_INVALID');
  if (input.failedAttempts >= maxFailedAttempts) return deny('SIGN_IN_RATE_LIMITED');
  if (!Number.isFinite(now)) return deny('CLOCK_INVALID');
  if (input.lockoutUntil !== null && input.lockoutUntil !== undefined) {
    const lockoutUntil = new Date(input.lockoutUntil).getTime();
    if (!Number.isFinite(lockoutUntil)) return deny('LOCKOUT_EXPIRY_INVALID');
    if (lockoutUntil > now) return deny('ACCOUNT_TEMPORARILY_LOCKED');
  }
  if (typeof input.mfaRequired !== 'boolean' || typeof input.mfaVerified !== 'boolean') return deny('MFA_STATE_REQUIRED');
  if (input.mfaRequired && !input.mfaVerified) return deny('MFA_REQUIRED');
  return { allowed: true, code: 'SIGN_IN_POLICY_PASSED', userId: input.userId.trim() };
}

/**
 * Evaluate a one-time token after the server has securely compared token hashes.
 * Callers must store only a cryptographic hash, consume atomically, and persist
 * the consumed state. This function alone cannot enforce single-use semantics.
 */
export function evaluateOneTimeToken(input, { now = Date.now() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('TOKEN_CONTEXT_INVALID');
  if (input.tokenMatched !== true) return deny('TOKEN_INVALID');
  if (input.consumedAt !== null && input.consumedAt !== undefined) return deny('TOKEN_ALREADY_USED');
  if (input.expiresAt === undefined || input.expiresAt === null) return deny('TOKEN_EXPIRY_REQUIRED');
  const expiresAt = new Date(input.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || !Number.isFinite(now)) return deny('TOKEN_CLOCK_INVALID');
  if (expiresAt <= now) return deny('TOKEN_EXPIRED');
  if (typeof input.purpose !== 'string' || !['EMAIL_VERIFICATION', 'PASSWORD_RESET'].includes(input.purpose)) return deny('TOKEN_PURPOSE_INVALID');
  if (typeof input.userId !== 'string' || !input.userId.trim()) return deny('TOKEN_USER_REQUIRED');
  return { allowed: true, code: 'TOKEN_POLICY_PASSED', purpose: input.purpose, userId: input.userId.trim() };
}

/** Return a public, non-enumerating message for account recovery requests. */
export function getPasswordResetPublicResponse() {
  return PASSWORD_RESET_PUBLIC_RESPONSE;
}

/** Pure sliding-window rate-limit decision; persistence and atomicity are external. */
export function evaluateAttemptWindow(timestamps, { now = Date.now(), windowMs = 15 * 60 * 1000, maxAttempts = 5 } = {}) {
  if (!Array.isArray(timestamps) || timestamps.some((t) => !Number.isFinite(t))) return deny('ATTEMPT_HISTORY_INVALID');
  if (!Number.isFinite(now) || !Number.isFinite(windowMs) || windowMs <= 0 || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1) return deny('RATE_LIMIT_POLICY_INVALID');
  const recent = timestamps.filter((t) => t > now - windowMs && t <= now);
  return { allowed: recent.length < maxAttempts, code: recent.length < maxAttempts ? 'ATTEMPT_ALLOWED' : 'ATTEMPT_RATE_LIMITED', recentAttempts: recent.length, remainingAttempts: Math.max(0, maxAttempts - recent.length) };
}
