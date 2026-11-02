import { randomUUID } from 'node:crypto';
import { paymentDb } from '../payments/runtime.mjs';
import { AuthenticationError, assertAuthMutation, expiredSessionCookie, describeCurrentSession, listOwnSessions, revokeCurrentSession, revokeAllOwnSessions } from './session-security.mjs';

const actions = { current: describeCurrentSession, sessions: listOwnSessions, logout: revokeCurrentSession, revokeAll: revokeAllOwnSessions };

export async function authResponse(name, request) {
  const requestId = randomUUID();
  const headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Request-ID': requestId };
  try {
    if (name === 'logout' || name === 'revokeAll') assertAuthMutation(request);
    // On a valid logout origin, clear the browser credential even if server revocation fails.
    if (name === 'logout') headers['Set-Cookie'] = expiredSessionCookie;
    const action = actions[name];
    if (!action) throw new AuthenticationError('AUTH_ACTION_NOT_FOUND', 404);
    const result = await action(await paymentDb(), request);
    if (name === 'revokeAll') headers['Set-Cookie'] = expiredSessionCookie;
    return Response.json(result, { headers });
  } catch (error) {
    const known = error instanceof AuthenticationError;
    return Response.json({ error: known ? error.code : 'AUTHENTICATION_SERVICE_UNAVAILABLE', requestId }, { status: known ? error.status : 503, headers });
  }
}
