/**
 * Pure admission policy for a future distributed rate-limit adapter.
 * This module does not count requests or provide storage. Production callers must
 * use an atomic shared store; process-local counters are not a safe substitute.
 */
export const RATE_LIMIT_PROFILES = Object.freeze({
  publicRead: Object.freeze({ limit: 120, windowSeconds: 60, failClosed: false }),
  accountWrite: Object.freeze({ limit: 20, windowSeconds: 60, failClosed: true }),
  authentication: Object.freeze({ limit: 8, windowSeconds: 300, failClosed: true }),
  supportSubmission: Object.freeze({ limit: 5, windowSeconds: 3600, failClosed: true }),
  financialOperation: Object.freeze({ limit: 5, windowSeconds: 60, failClosed: true }),
});

const identifierPattern = /^[a-zA-Z0-9:_-]{8,200}$/;

export function evaluateRateLimit(input, { now = Date.now(), profiles = RATE_LIMIT_PROFILES } = {}) {
  if (!input || typeof input !== 'object') return deny('RATE_LIMIT_INPUT_INVALID');
  const profile = profiles[input.profile];
  if (!profile) return deny('RATE_LIMIT_PROFILE_UNKNOWN');
  if (!Number.isSafeInteger(now) || now < 0) return deny('RATE_LIMIT_CLOCK_INVALID');
  if (input.storeAvailable !== true) {
    return profile.failClosed
      ? deny('RATE_LIMIT_STORE_UNAVAILABLE')
      : allow('RATE_LIMIT_STORE_UNAVAILABLE_PUBLIC_DEGRADED', { degraded: true });
  }
  if (typeof input.subjectKey !== 'string' || !identifierPattern.test(input.subjectKey)) {
    return deny('RATE_LIMIT_SUBJECT_INVALID');
  }
  if (!Number.isSafeInteger(input.count) || input.count < 0) return deny('RATE_LIMIT_COUNTER_INVALID');
  if (!Number.isSafeInteger(input.windowStartedAt) || input.windowStartedAt < 0) {
    return deny('RATE_LIMIT_WINDOW_INVALID');
  }

  const windowMs = profile.windowSeconds * 1000;
  const age = now - input.windowStartedAt;
  if (age < 0) return deny('RATE_LIMIT_WINDOW_IN_FUTURE');
  if (age >= windowMs) {
    return allow('RATE_LIMIT_WINDOW_RESET', { limit: profile.limit, remaining: profile.limit - 1, resetAt: now + windowMs });
  }
  if (input.count >= profile.limit) {
    return deny('RATE_LIMIT_EXCEEDED', {
      limit: profile.limit,
      remaining: 0,
      resetAt: input.windowStartedAt + windowMs,
      retryAfterSeconds: Math.max(1, Math.ceil((input.windowStartedAt + windowMs - now) / 1000)),
    });
  }
  return allow('RATE_LIMIT_WITHIN_BUDGET', {
    limit: profile.limit,
    remaining: Math.max(0, profile.limit - input.count - 1),
    resetAt: input.windowStartedAt + windowMs,
  });
}

/** Require a trusted, server-derived identifier; never trust a client-supplied subject key. */
export function validateRateLimitSubject({ authenticatedUserId, serverDerivedIpHash, profile }) {
  if (!RATE_LIMIT_PROFILES[profile]) return deny('RATE_LIMIT_PROFILE_UNKNOWN');
  const raw = authenticatedUserId || serverDerivedIpHash;
  if (typeof raw !== 'string' || !identifierPattern.test(raw)) return deny('RATE_LIMIT_SUBJECT_INVALID');
  return allow('RATE_LIMIT_SUBJECT_VALID', { subjectKey: `${profile}:${raw}` });
}

function allow(code, details = {}) { return { allowed: true, code, ...details }; }
function deny(code, details = {}) { return { allowed: false, code, ...details }; }
