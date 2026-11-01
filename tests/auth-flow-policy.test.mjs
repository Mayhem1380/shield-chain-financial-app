import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSignInPolicy, evaluateOneTimeToken, getPasswordResetPublicResponse, evaluateAttemptWindow } from '../lib/auth-flow-policy.mjs';

const now = Date.parse('2026-10-21T00:00:00.000Z');
const validSignIn = { providerVerified: true, userId: 'user-1', accountStatus: 'ACTIVE', emailVerified: true, failedAttempts: 0, lockoutUntil: null, mfaRequired: false, mfaVerified: false };
const validToken = { tokenMatched: true, consumedAt: null, expiresAt: now + 60_000, purpose: 'PASSWORD_RESET', userId: 'user-1' };

test('allows a provider-verified active account with verified email', () => assert.equal(evaluateSignInPolicy(validSignIn, { now }).allowed, true));
test('denies credentials not verified by trusted provider', () => assert.equal(evaluateSignInPolicy({ ...validSignIn, providerVerified: false }, { now }).code, 'CREDENTIALS_NOT_VERIFIED'));
test('denies pending, restricted, and closed accounts', () => {
  for (const accountStatus of ['PENDING', 'RESTRICTED', 'CLOSED']) assert.equal(evaluateSignInPolicy({ ...validSignIn, accountStatus }, { now }).code, 'ACCOUNT_NOT_ACTIVE');
});
test('denies unverified email', () => assert.equal(evaluateSignInPolicy({ ...validSignIn, emailVerified: false }, { now }).code, 'EMAIL_NOT_VERIFIED'));
test('denies MFA-required sign-in until MFA is verified', () => assert.equal(evaluateSignInPolicy({ ...validSignIn, mfaRequired: true }, { now }).code, 'MFA_REQUIRED'));
test('denies locked accounts and exhausted failed-attempt allowance', () => {
  assert.equal(evaluateSignInPolicy({ ...validSignIn, lockoutUntil: now + 1000 }, { now }).code, 'ACCOUNT_TEMPORARILY_LOCKED');
  assert.equal(evaluateSignInPolicy({ ...validSignIn, failedAttempts: 10 }, { now }).code, 'SIGN_IN_RATE_LIMITED');
});
test('allows a valid, unconsumed, unexpired purpose-bound token', () => assert.equal(evaluateOneTimeToken(validToken, { now }).allowed, true));
test('denies invalid, consumed, expired, or purpose-less tokens', () => {
  assert.equal(evaluateOneTimeToken({ ...validToken, tokenMatched: false }, { now }).code, 'TOKEN_INVALID');
  assert.equal(evaluateOneTimeToken({ ...validToken, consumedAt: now - 1 }, { now }).code, 'TOKEN_ALREADY_USED');
  assert.equal(evaluateOneTimeToken({ ...validToken, expiresAt: now }, { now }).code, 'TOKEN_EXPIRED');
  assert.equal(evaluateOneTimeToken({ ...validToken, purpose: 'OTHER' }, { now }).code, 'TOKEN_PURPOSE_INVALID');
});
test('password reset response does not reveal whether an account exists', () => assert.equal(getPasswordResetPublicResponse(), 'If an account matches those details, instructions will be sent shortly.'));
test('sliding-window attempt policy allows below threshold and blocks at threshold', () => {
  assert.equal(evaluateAttemptWindow([now - 1000, now - 2000], { now, maxAttempts: 3 }).allowed, true);
  assert.equal(evaluateAttemptWindow([now - 1000, now - 2000, now - 3000], { now, maxAttempts: 3 }).code, 'ATTEMPT_RATE_LIMITED');
});
test('attempt window ignores stale and future timestamps', () => {
  const result = evaluateAttemptWindow([now - 20_000, now + 10_000], { now, windowMs: 10_000, maxAttempts: 2 });
  assert.equal(result.recentAttempts, 0);
  assert.equal(result.allowed, true);
});
