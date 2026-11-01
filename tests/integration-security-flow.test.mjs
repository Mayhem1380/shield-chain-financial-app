import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRequestIntegrity } from '../lib/request-integrity-policy.mjs';
import { evaluateRateLimit, validateRateLimitSubject } from '../lib/rate-limit-policy.mjs';
import { evaluateAccess } from '../lib/access-policy.mjs';
import { evaluateFinancialOperation } from '../lib/financial-operation-policy.mjs';
import { buildSecurityEvent } from '../lib/security-event-policy.mjs';

const csrf = 'a'.repeat(40);
const request = (overrides = {}) => ({
  method: 'POST', origin: 'https://app.example.test',
  allowedOrigins: ['https://app.example.test'], contentType: 'application/json',
  csrfCookie: csrf, csrfHeader: csrf, secFetchSite: 'same-origin', ...overrides,
});
const customerSession = { valid: true, userId: 'user_12345678', accountStatus: 'ACTIVE', role: 'customer', mfaVerified: false };
const correlationId = 'corr_12345678';

test('cross-policy flow admits only a well-formed request through request-integrity and rate-limit policies', () => {
  assert.equal(evaluateRequestIntegrity(request()).allowed, true);
  const subject = validateRateLimitSubject({ authenticatedUserId: 'user_12345678', profile: 'financialOperation' });
  assert.equal(subject.allowed, true);
  const limit = evaluateRateLimit({ profile: 'financialOperation', storeAvailable: true, subjectKey: subject.subjectKey, count: 0, windowStartedAt: 1_000 }, { now: 2_000 });
  assert.equal(limit.allowed, true);
  assert.equal(limit.code, 'RATE_LIMIT_WITHIN_BUDGET');
});

test('cross-site mutation stops before downstream operation admission', () => {
  const integrity = evaluateRequestIntegrity(request({ secFetchSite: 'cross-site' }));
  assert.equal(integrity.allowed, false);
  assert.equal(integrity.code, 'CROSS_SITE_MUTATION_BLOCKED');
  const operation = evaluateFinancialOperation({ serverAuthorized: true, accountStatus: 'ACTIVE', stepUpVerified: true, idempotencyKey: 'operation_key_1234', idempotencyState: 'NEW', currency: 'AUD', amount: '10.00', reviewedQuote: true, riskChecksPassed: true });
  assert.equal(operation.allowed, false);
  assert.equal(operation.code, 'LIVE_CAPABILITY_DISABLED');
});

test('sensitive rate-limit store outage fails closed for financial operations', () => {
  const result = evaluateRateLimit({ profile: 'financialOperation', storeAvailable: false, subjectKey: 'user_12345678', count: 0, windowStartedAt: 1_000 }, { now: 2_000 });
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'RATE_LIMIT_STORE_UNAVAILABLE');
});

test('authorization denial can be represented as a privacy-filtered security event', () => {
  const access = evaluateAccess({ session: customerSession, permission: 'admin:users:manage' });
  assert.equal(access.allowed, false);
  const event = buildSecurityEvent({ type: 'ACCESS_DENIED', correlationId, actorId: customerSession.userId, metadata: { reason: access.reason, routeClass: 'admin' } }, { now: 1_800_000_000_000 });
  assert.equal(event.allowed, true);
  assert.equal(event.event.metadata.reason, 'PERMISSION_DENIED');
  assert.equal(Object.hasOwn(event.event.metadata, 'password'), false);
});

test('missing CSRF token prevents request admission even with a valid user session', () => {
  const integrity = evaluateRequestIntegrity(request({ csrfHeader: undefined }));
  assert.equal(integrity.allowed, false);
  assert.equal(integrity.code, 'CSRF_TOKEN_MISSING_OR_INVALID');
  assert.equal(evaluateAccess({ session: customerSession, permission: 'account:read:own', resourceOwnerId: customerSession.userId }).allowed, true);
  // A valid session does not override the separate request-integrity decision.
});

test('financial rate-limit budget exhaustion denies before financial operation policy', () => {
  const limit = evaluateRateLimit({ profile: 'financialOperation', storeAvailable: true, subjectKey: 'user_12345678', count: 5, windowStartedAt: 1_000 }, { now: 2_000 });
  assert.equal(limit.allowed, false);
  assert.equal(limit.code, 'RATE_LIMIT_EXCEEDED');
});
