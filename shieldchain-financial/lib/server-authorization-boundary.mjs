import { evaluateAccess } from './access-policy.mjs';

/**
 * Fail-closed server boundary for future route handlers.
 * The caller MUST inject a trusted server-side session resolver and load resource
 * ownership/assignment from the database. Never pass a principal from request JSON.
 * This helper does not parse cookies, verify tokens, or connect to an identity provider.
 */
export async function authorizeServerOperation({
  request,
  resolveVerifiedSession,
  permission,
  loadResourceContext,
  stepUpRequired = false,
} = {}) {
  const deny = (status, code) => ({ allowed: false, status, code });

  if (!request || typeof request !== 'object') return deny(401, 'REQUEST_REQUIRED');
  if (typeof resolveVerifiedSession !== 'function') return deny(503, 'IDENTITY_PROVIDER_NOT_CONFIGURED');
  if (typeof permission !== 'string' || permission.length === 0) return deny(403, 'PERMISSION_REQUIRED');

  let session;
  try {
    session = await resolveVerifiedSession(request);
  } catch {
    return deny(401, 'SESSION_RESOLUTION_FAILED');
  }
  if (!session || typeof session !== 'object' || session.valid !== true) return deny(401, 'SESSION_INVALID');

  let resource = {};
  if (loadResourceContext !== undefined) {
    if (typeof loadResourceContext !== 'function') return deny(503, 'RESOURCE_LOADER_INVALID');
    try {
      resource = await loadResourceContext({ session, request });
    } catch {
      return deny(503, 'RESOURCE_CONTEXT_UNAVAILABLE');
    }
    if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
      return deny(503, 'RESOURCE_CONTEXT_UNAVAILABLE');
    }
  }

  const decision = evaluateAccess({
    session,
    permission,
    resourceOwnerId: resource.resourceOwnerId,
    assignedToUserId: resource.assignedToUserId,
    stepUpRequired,
  });
  if (!decision.allowed) return deny(decision.reason === 'SESSION_MISSING' || decision.reason === 'SESSION_INVALID' ? 401 : 403, decision.reason);

  return { allowed: true, status: 200, code: 'POLICY_ALLOWED', principal: { userId: session.userId, role: session.role } };
}
