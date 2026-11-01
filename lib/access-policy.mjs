/**
 * Provider-neutral authorization policy primitives.
 *
 * These pure functions do not resolve sessions, query a database, authenticate a
 * person, or protect any route by themselves. Server handlers must load trusted
 * session/account/resource data first and call this policy before every action.
 * Unknown inputs are denied by default.
 */

const rolePermissions = Object.freeze({
  customer: new Set([
    'account:read:own',
    'support:read:own',
    'support:create:own',
    'support:reply:own',
  ]),
  support: new Set([
    'support:read:assigned',
    'support:reply:assigned',
  ]),
  reviewer: new Set([
    'support:read:assigned',
    'risk:withdrawal:review',
    'withdrawal:approve',
  ]),
  admin: new Set([
    'admin:users:manage',
    'admin:roles:manage',
    'admin:system:configure',
  ]),
});

const activeAccountStatuses = new Set(['ACTIVE']);
const staffRoles = new Set(['support', 'reviewer', 'admin']);
const validPermissionPattern = /^[a-z][a-z0-9]*(?::[a-z][a-z0-9]*){1,3}$/;

/** Returns a copy so callers cannot mutate the internal role policy. */
export function permissionsForRole(role) {
  return [...(rolePermissions[role] ?? new Set())];
}

/**
 * Evaluate a protected operation using trusted, server-resolved context.
 * `session` must come from a verified server-side session lookup, never request JSON.
 */
export function evaluateAccess({ session, permission, resourceOwnerId, assignedToUserId, stepUpRequired = false } = {}) {
  const deny = (reason) => ({ allowed: false, reason });

  if (!session || typeof session !== 'object' || Array.isArray(session)) return deny('SESSION_MISSING');
  if (session.valid !== true) return deny('SESSION_INVALID');
  if (typeof session.userId !== 'string' || session.userId.trim() === '') return deny('IDENTITY_MISSING');
  if (!activeAccountStatuses.has(session.accountStatus)) return deny('ACCOUNT_NOT_ACTIVE');
  if (typeof permission !== 'string' || !validPermissionPattern.test(permission)) return deny('PERMISSION_INVALID');

  const role = session.role;
  const permissions = rolePermissions[role];
  if (!permissions || !permissions.has(permission)) return deny('PERMISSION_DENIED');

  if (staffRoles.has(role) && session.mfaVerified !== true) return deny('STAFF_MFA_REQUIRED');
  if (stepUpRequired && session.stepUpVerified !== true) return deny('STEP_UP_REQUIRED');

  if (permission.endsWith(':own')) {
    if (typeof resourceOwnerId !== 'string' || resourceOwnerId === '') return deny('RESOURCE_OWNER_UNKNOWN');
    if (resourceOwnerId !== session.userId) return deny('RESOURCE_NOT_OWNED');
  }

  if (permission.endsWith(':assigned')) {
    if (typeof assignedToUserId !== 'string' || assignedToUserId === '') return deny('ASSIGNMENT_UNKNOWN');
    if (assignedToUserId !== session.userId) return deny('RESOURCE_NOT_ASSIGNED');
  }

  return { allowed: true, reason: 'POLICY_ALLOWED' };
}

/** Prevent accidental privilege inheritance: role membership alone never grants a permission. */
export function hasExplicitPermission(role, permission) {
  if (typeof permission !== 'string' || !validPermissionPattern.test(permission)) return false;
  return rolePermissions[role]?.has(permission) ?? false;
}
