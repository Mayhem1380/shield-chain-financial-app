import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRateLimit, validateRateLimitSubject, RATE_LIMIT_PROFILES } from '../lib/rate-limit-policy.mjs';
const now = 1_800_000_000_000;
const valid = { profile: 'authentication', storeAvailable: true, subjectKey: 'auth:user_123456', count: 2, windowStartedAt: now - 10_000 };

test('allows a request within the configured budget', () => assert.equal(evaluateRateLimit(valid, { now }).allowed, true));
test('returns a bounded remaining count and reset time', () => {
  const result = evaluateRateLimit(valid, { now });
  assert.equal(result.remaining, RATE_LIMIT_PROFILES.authentication.limit - 3);
  assert.equal(result.resetAt, valid.windowStartedAt + 300_000);
});
test('blocks at the profile limit and provides retry guidance', () => {
  const result = evaluateRateLimit({ ...valid, count: 8 }, { now });
  assert.equal(result.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(result.retryAfterSeconds, 290);
});
test('resets an expired window', () => assert.equal(evaluateRateLimit({ ...valid, windowStartedAt: now - 300_000, count: 99 }, { now }).code, 'RATE_LIMIT_WINDOW_RESET'));
test('fails closed when the shared store is unavailable for authentication', () => assert.equal(evaluateRateLimit({ ...valid, storeAvailable: false }, { now }).code, 'RATE_LIMIT_STORE_UNAVAILABLE'));
test('public reads explicitly mark store outage as degraded rather than secure limiting', () => {
  const result = evaluateRateLimit({ ...valid, profile: 'publicRead', storeAvailable: false }, { now });
  assert.equal(result.allowed, true);
  assert.equal(result.degraded, true);
});
test('rejects unknown profiles', () => assert.equal(evaluateRateLimit({ ...valid, profile: 'adminEverything' }, { now }).code, 'RATE_LIMIT_PROFILE_UNKNOWN'));
test('rejects untrusted or malformed subject keys', () => assert.equal(evaluateRateLimit({ ...valid, subjectKey: '127.0.0.1' }, { now }).code, 'RATE_LIMIT_SUBJECT_INVALID'));
test('rejects malformed counters and future windows', () => {
  assert.equal(evaluateRateLimit({ ...valid, count: -1 }, { now }).code, 'RATE_LIMIT_COUNTER_INVALID');
  assert.equal(evaluateRateLimit({ ...valid, windowStartedAt: now + 1 }, { now }).code, 'RATE_LIMIT_WINDOW_IN_FUTURE');
});
test('validates server-derived subject before key construction', () => {
  assert.equal(validateRateLimitSubject({ authenticatedUserId: 'user_12345678', profile: 'accountWrite' }).allowed, true);
  assert.equal(validateRateLimitSubject({ authenticatedUserId: 'user', serverDerivedIpHash: '', profile: 'accountWrite' }).allowed, false);
});
