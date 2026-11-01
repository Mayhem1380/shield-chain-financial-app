import test from 'node:test';
import assert from 'node:assert/strict';
import { validateVerifiedSession } from '../lib/verified-session-contract.mjs';

const now = Date.parse('2026-10-21T00:00:00.000Z');
const valid = {
  valid: true, sessionId: 'sess_123', userId: 'user_123', role: 'customer',
  accountStatus: 'ACTIVE', emailVerified: true, mfaVerified: false,
  expiresAt: '2026-10-21T01:00:00.000Z',
};

test('accepts and normalizes a complete trusted-provider session', () => {
  const result = validateVerifiedSession(valid, { now });
  assert.equal(result.valid, true);
  assert.equal(result.userId, 'user_123');
  assert.equal(result.stepUpVerified, false);
  assert.equal(result.expiresAt, '2026-10-21T01:00:00.000Z');
});

test('rejects missing or unverified sessions', () => {
  assert.equal(validateVerifiedSession(null, { now }).code, 'SESSION_SHAPE_INVALID');
  assert.equal(validateVerifiedSession({ ...valid, valid: false }, { now }).code, 'SESSION_NOT_VERIFIED');
});

test('requires provider session and user identifiers', () => {
  assert.equal(validateVerifiedSession({ ...valid, sessionId: '' }, { now }).code, 'SESSION_ID_REQUIRED');
  assert.equal(validateVerifiedSession({ ...valid, userId: '' }, { now }).code, 'USER_ID_REQUIRED');
});

test('rejects unknown roles and account states', () => {
  assert.equal(validateVerifiedSession({ ...valid, role: 'superuser' }, { now }).code, 'ROLE_INVALID');
  assert.equal(validateVerifiedSession({ ...valid, accountStatus: 'MAGIC' }, { now }).code, 'ACCOUNT_STATUS_INVALID');
});

test('requires verified email and an explicit MFA state', () => {
  assert.equal(validateVerifiedSession({ ...valid, emailVerified: false }, { now }).code, 'EMAIL_NOT_VERIFIED');
  assert.equal(validateVerifiedSession({ ...valid, mfaVerified: undefined }, { now }).code, 'MFA_STATE_REQUIRED');
});

test('rejects expired sessions and invalid expiry clocks', () => {
  assert.equal(validateVerifiedSession({ ...valid, expiresAt: '2026-10-20T23:59:00Z' }, { now }).code, 'SESSION_EXPIRED_OR_CLOCK_INVALID');
  assert.equal(validateVerifiedSession({ ...valid, expiresAt: 'not-a-date' }, { now }).code, 'SESSION_EXPIRED_OR_CLOCK_INVALID');
  assert.equal(validateVerifiedSession({ ...valid, expiresAt: '2026-10-21T01:00:00Z' }, { now: NaN }).code, 'SESSION_EXPIRED_OR_CLOCK_INVALID');
});

test('rejects malformed step-up claims', () => {
  assert.equal(validateVerifiedSession({ ...valid, stepUpVerified: 'yes' }, { now }).code, 'STEP_UP_STATE_INVALID');
});

test('does not carry arbitrary provider claims into the normalized principal', () => {
  const result = validateVerifiedSession({ ...valid, privateKey: 'must-not-leak', accessToken: 'secret' }, { now });
  assert.equal(result.valid, true);
  assert.equal('privateKey' in result, false);
  assert.equal('accessToken' in result, false);
});
