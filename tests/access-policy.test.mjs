import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAccess, hasExplicitPermission, permissionsForRole } from '../lib/access-policy.mjs';

const customer = {
  valid: true, userId: 'customer-a', accountStatus: 'ACTIVE', role: 'customer',
  mfaVerified: false, stepUpVerified: false,
};
const reviewer = {
  valid: true, userId: 'reviewer-1', accountStatus: 'ACTIVE', role: 'reviewer',
  mfaVerified: true, stepUpVerified: true,
};

test('denies absent, invalid, or incomplete sessions by default', () => {
  assert.equal(evaluateAccess({ permission: 'account:read:own' }).reason, 'SESSION_MISSING');
  assert.equal(evaluateAccess({ session: { ...customer, valid: false }, permission: 'account:read:own' }).reason, 'SESSION_INVALID');
  assert.equal(evaluateAccess({ session: { ...customer, userId: '' }, permission: 'account:read:own' }).reason, 'IDENTITY_MISSING');
});

test('denies non-active account states even when the session is valid', () => {
  for (const accountStatus of ['PENDING', 'RESTRICTED', 'CLOSED', undefined]) {
    assert.equal(evaluateAccess({ session: { ...customer, accountStatus }, permission: 'account:read:own', resourceOwnerId: 'customer-a' }).reason, 'ACCOUNT_NOT_ACTIVE');
  }
});

test('allows customers to read their own account but not another user\'s account', () => {
  assert.deepEqual(evaluateAccess({ session: customer, permission: 'account:read:own', resourceOwnerId: 'customer-a' }), { allowed: true, reason: 'POLICY_ALLOWED' });
  assert.equal(evaluateAccess({ session: customer, permission: 'account:read:own', resourceOwnerId: 'customer-b' }).reason, 'RESOURCE_NOT_OWNED');
});

test('denies own-resource access when ownership is missing or unknown', () => {
  assert.equal(evaluateAccess({ session: customer, permission: 'account:read:own' }).reason, 'RESOURCE_OWNER_UNKNOWN');
  assert.equal(evaluateAccess({ session: customer, permission: 'account:read:own', resourceOwnerId: '' }).reason, 'RESOURCE_OWNER_UNKNOWN');
});

test('staff permissions require MFA even when the requested permission is valid', () => {
  assert.equal(evaluateAccess({ session: { ...reviewer, mfaVerified: false }, permission: 'withdrawal:approve' }).reason, 'STAFF_MFA_REQUIRED');
  assert.equal(evaluateAccess({ session: { ...reviewer, role: 'support', mfaVerified: true }, permission: 'support:read:assigned', assignedToUserId: 'reviewer-1' }).allowed, true);
});

test('assigned-case permissions require a matching server-loaded assignment', () => {
  const support = { ...reviewer, role: 'support' };
  assert.equal(evaluateAccess({ session: support, permission: 'support:read:assigned', assignedToUserId: 'reviewer-1' }).allowed, true);
  assert.equal(evaluateAccess({ session: support, permission: 'support:read:assigned', assignedToUserId: 'someone-else' }).reason, 'RESOURCE_NOT_ASSIGNED');
  assert.equal(evaluateAccess({ session: support, permission: 'support:read:assigned' }).reason, 'ASSIGNMENT_UNKNOWN');
});

test('sensitive actions can require step-up verification', () => {
  assert.equal(evaluateAccess({ session: { ...reviewer, stepUpVerified: false }, permission: 'withdrawal:approve', stepUpRequired: true }).reason, 'STEP_UP_REQUIRED');
  assert.equal(evaluateAccess({ session: reviewer, permission: 'withdrawal:approve', stepUpRequired: true }).allowed, true);
});

test('administrator role does not implicitly grant withdrawal approval', () => {
  const admin = { ...reviewer, role: 'admin' };
  assert.equal(hasExplicitPermission('admin', 'admin:users:manage'), true);
  assert.equal(evaluateAccess({ session: admin, permission: 'withdrawal:approve' }).reason, 'PERMISSION_DENIED');
});

test('rejects malformed permission strings and unknown roles', () => {
  assert.equal(evaluateAccess({ session: customer, permission: 'ALL' }).reason, 'PERMISSION_INVALID');
  assert.equal(evaluateAccess({ session: { ...customer, role: 'superuser' }, permission: 'account:read:own', resourceOwnerId: 'customer-a' }).reason, 'PERMISSION_DENIED');
  assert.equal(hasExplicitPermission('admin', '*'), false);
});

test('role permission listing cannot mutate internal policy', () => {
  const listed = permissionsForRole('customer');
  listed.push('withdrawal:approve');
  assert.equal(hasExplicitPermission('customer', 'withdrawal:approve'), false);
  assert.deepEqual(permissionsForRole('unknown-role'), []);
});
