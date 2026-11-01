import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeServerOperation } from '../lib/server-authorization-boundary.mjs';

const request = { headers: { 'x-user-id': 'attacker-controlled' } };
const customer = { valid: true, userId: 'user-a', accountStatus: 'ACTIVE', role: 'customer', mfaVerified: false };

test('fails closed when no trusted identity resolver is configured', async () => {
  assert.deepEqual(await authorizeServerOperation({ request, permission: 'account:read:own' }), {
    allowed: false, status: 503, code: 'IDENTITY_PROVIDER_NOT_CONFIGURED',
  });
});

test('does not treat a client-supplied user header as an authenticated session', async () => {
  const result = await authorizeServerOperation({ request, permission: 'account:read:own' });
  assert.equal(result.allowed, false);
  assert.notEqual(result.principal?.userId, 'attacker-controlled');
});

test('denies when trusted session resolution fails or throws', async () => {
  assert.equal((await authorizeServerOperation({ request, permission: 'account:read:own', resolveVerifiedSession: async () => null })).code, 'SESSION_INVALID');
  assert.equal((await authorizeServerOperation({ request, permission: 'account:read:own', resolveVerifiedSession: async () => { throw new Error('provider down'); } })).code, 'SESSION_RESOLUTION_FAILED');
});

test('loads ownership on the server and denies another user resource', async () => {
  const result = await authorizeServerOperation({
    request, permission: 'account:read:own', resolveVerifiedSession: async () => customer,
    loadResourceContext: async () => ({ resourceOwnerId: 'user-b' }),
  });
  assert.deepEqual(result, { allowed: false, status: 403, code: 'RESOURCE_NOT_OWNED' });
});

test('allows an owned account only after the trusted resolver and server resource loader succeed', async () => {
  const result = await authorizeServerOperation({
    request, permission: 'account:read:own', resolveVerifiedSession: async () => customer,
    loadResourceContext: async ({ session }) => ({ resourceOwnerId: session.userId }),
  });
  assert.deepEqual(result, { allowed: true, status: 200, code: 'POLICY_ALLOWED', principal: { userId: 'user-a', role: 'customer' } });
});

test('fails closed when server resource context cannot be loaded', async () => {
  const result = await authorizeServerOperation({
    request, permission: 'account:read:own', resolveVerifiedSession: async () => customer,
    loadResourceContext: async () => { throw new Error('database unavailable'); },
  });
  assert.equal(result.code, 'RESOURCE_CONTEXT_UNAVAILABLE');
});

test('requires valid staff MFA and step-up for sensitive actions', async () => {
  const reviewer = { ...customer, role: 'reviewer', mfaVerified: true, stepUpVerified: false };
  const result = await authorizeServerOperation({ request, permission: 'withdrawal:approve', resolveVerifiedSession: async () => reviewer, stepUpRequired: true });
  assert.equal(result.code, 'STEP_UP_REQUIRED');
});
