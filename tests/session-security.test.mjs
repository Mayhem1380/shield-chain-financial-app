import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sessionDigest, requireDatabaseSession, requireRecentSessionMfa, assertAuthMutation, listOwnSessions, revokeCurrentSession, revokeAllOwnSessions } from '../lib/auth/session-security.mjs';
import { authResponse } from '../lib/auth/http.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const env = { AUTH_ORIGIN: 'https://shieldchain.test' };
const request = (cookie = `__Host-sf_session=${'a'.repeat(64)}`, origin = env.AUTH_ORIGIN) => new Request(`${env.AUTH_ORIGIN}/api/auth/logout`, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'foreign-user' }) });

// Isolated repository fixtures; real PostgreSQL execution is a separate guarded CI suite.
function fixture() {
  let state = {
    rows: [
      { id: 's1', userId: 'u1', tokenHash: digest('a'.repeat(64)), createdAt: new Date(0), expiresAt: new Date(Date.now() + 60000), mfaVerifiedAt: new Date(), revokedAt: null },
      { id: 's2', userId: 'u1', tokenHash: digest('b'.repeat(64)), createdAt: new Date(0), expiresAt: new Date(Date.now() + 60000), mfaVerifiedAt: new Date(), revokedAt: null },
      { id: 's3', userId: 'u2', tokenHash: digest('c'.repeat(64)), createdAt: new Date(0), expiresAt: new Date(Date.now() + 60000), mfaVerifiedAt: new Date(), revokedAt: null },
    ], audits: [], limits: new Map(),
  };
  const users = { u1: { id: 'u1', status: 'ACTIVE', emailVerifiedAt: new Date(0), mfaEnabled: true }, u2: { id: 'u2', status: 'ACTIVE', emailVerifiedAt: new Date(0), mfaEnabled: true } };
  const client = {
    authSession: {
      findUnique: async ({ where, include }) => { const row = state.rows.find(item => item.tokenHash === where.tokenHash); return row ? { ...row, ...(include?.user ? { user: users[row.userId] } : {}) } : null; },
      findMany: async ({ where, select }) => state.rows.filter(row => row.userId === where.userId && !row.revokedAt && row.expiresAt > where.expiresAt.gt).map(row => Object.fromEntries(Object.keys(select).map(key => [key, row[key]]))),
      updateMany: async ({ where, data }) => { let count = 0; for (const row of state.rows) if ((!where.tokenHash || row.tokenHash === where.tokenHash) && (!where.userId || row.userId === where.userId) && !row.revokedAt) { Object.assign(row, data); count++; } return { count }; },
    },
    auditEvent: { create: async ({ data }) => state.audits.push(data) },
    paymentRateLimit: { upsert: async ({ where }) => { const count = (state.limits.get(where.key) || 0) + 1; state.limits.set(where.key, count); return { count }; } },
    $transaction: async action => { const before = structuredClone(state); try { return await action(client); } catch (error) { state = before; throw error; } },
  };
  return { client, users, state: () => state };
}

test('only one well-formed host cookie is accepted and only its hash is used', () => {
  assert.equal(sessionDigest(request()), digest('a'.repeat(64)));
  assert.equal(sessionDigest(request(`__Host-sf_session=${'a'.repeat(64)}; __Host-sf_session=${'b'.repeat(64)}`)), null);
  assert.equal(sessionDigest(request('__Host-sf_session=short')), null);
  assert.equal(sessionDigest(request('unrelated=value')), null);
});
test('invalid clock/expiry, revoked, restricted or unverified accounts fail closed', async () => {
  for (const change of ['expired', 'invalid-date', 'revoked', 'restricted', 'unverified']) {
    const f = fixture();
    if (change === 'expired') f.state().rows[0].expiresAt = new Date(0);
    if (change === 'invalid-date') f.state().rows[0].expiresAt = new Date('invalid');
    if (change === 'revoked') f.state().rows[0].revokedAt = new Date();
    if (change === 'restricted') f.users.u1.status = 'RESTRICTED';
    if (change === 'unverified') f.users.u1.emailVerifiedAt = null;
    await assert.rejects(requireDatabaseSession(f.client, request()), /AUTHENTICATION_REQUIRED/);
  }
});
test('session list is owner-scoped and never returns credential hashes', async () => {
  const f = fixture(); const result = await listOwnSessions(f.client, request());
  assert.deepEqual(result.sessions.map(session => session.id), ['s1', 's2']);
  assert.equal(result.sessions[0].current, true); assert.equal(result.sessions[1].current, false);
  assert.equal(JSON.stringify(result).includes('tokenHash'), false);
  assert.equal(JSON.stringify(result).includes(digest('a'.repeat(64))), false);
});
test('logout revokes the presented session only and is idempotent', async () => {
  const f = fixture();
  assert.deepEqual(await revokeCurrentSession(f.client, request(), env), { loggedOut: true, revoked: true });
  assert.equal(f.state().rows[1].revokedAt, null); assert.equal(f.state().rows[2].revokedAt, null);
  assert.deepEqual(await revokeCurrentSession(f.client, request(), env), { loggedOut: true, revoked: false });
  assert.equal(f.state().audits.length, 1);
  await assert.rejects(requireDatabaseSession(f.client, request()), /AUTHENTICATION_REQUIRED/);
});
test('revoke-all requires recent MFA and ignores client-supplied ownership', async () => {
  const f = fixture();
  f.state().rows[0].mfaVerifiedAt = new Date(0);
  await assert.rejects(revokeAllOwnSessions(f.client, request(), env), /RECENT_MFA_REQUIRED/);
  f.state().rows[0].mfaVerifiedAt = new Date();
  assert.equal((await revokeAllOwnSessions(f.client, request(), env)).revokedCount, 2);
  assert.equal(f.state().rows[2].revokedAt, null);
  assert.equal(f.state().audits[0].actorUserId, 'u1');
});
test('audit failure rolls back a revocation instead of claiming success', async () => {
  const f = fixture(); f.client.auditEvent.create = async () => { throw Error('fixture-db-failure'); };
  await assert.rejects(revokeCurrentSession(f.client, request(), env), /fixture-db-failure/);
  assert.equal(f.state().rows[0].revokedAt, null);
});
test('session-reading activity does not consume the revoke-all safety-action bucket', async () => {
  const f = fixture();
  for (let index = 0; index < 6; index++) await listOwnSessions(f.client, request());
  assert.equal((await revokeAllOwnSessions(f.client, request(), env)).revokedCount, 2);
});
test('auth origin is independent of payment activation and rejects cross-site or non-JSON mutations', () => {
  assert.doesNotThrow(() => assertAuthMutation(request(), env));
  assert.throws(() => assertAuthMutation(request(undefined, 'https://evil.test'), env), /ORIGIN_REJECTED/);
  assert.throws(() => assertAuthMutation(request(), {}), /NOT_CONFIGURED/);
  assert.throws(() => assertAuthMutation(new Request('https://shieldchain.test', { method: 'POST', headers: { origin: env.AUTH_ORIGIN } }), env), /JSON_REQUIRED/);
});
test('future and invalid MFA timestamps cannot satisfy a step-up check', () => {
  for (const mfaVerifiedAt of [new Date(Date.now() + 60000), new Date('invalid'), null]) assert.throws(() => requireRecentSessionMfa({ user: { mfaEnabled: true }, mfaVerifiedAt }), /RECENT_MFA_REQUIRED/);
});
test('logout clears the browser cookie on DB outage without claiming server revocation', async () => {
  const previousDb = process.env.DATABASE_URL, previousOrigin = process.env.AUTH_ORIGIN;
  delete process.env.DATABASE_URL; process.env.AUTH_ORIGIN = env.AUTH_ORIGIN;
  try {
    const response = await authResponse('logout', request());
    assert.equal(response.status, 503);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
    assert.equal((await response.json()).loggedOut, undefined);
    const denied = await authResponse('logout', request(undefined, 'https://evil.test'));
    assert.equal(denied.status, 403); assert.equal(denied.headers.get('set-cookie'), null);
  } finally {
    if (previousDb === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDb;
    if (previousOrigin === undefined) delete process.env.AUTH_ORIGIN; else process.env.AUTH_ORIGIN = previousOrigin;
  }
});
