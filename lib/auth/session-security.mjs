import { createHash } from 'node:crypto';

export class AuthenticationError extends Error {
  constructor(code, status = 401) { super(code); this.code = code; this.status = status; }
}
export const expiredSessionCookie = '__Host-sf_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';

export function sessionDigest(request) {
  const cookies = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith('__Host-sf_session='));
  // Reject ambiguous duplicate cookies rather than selecting an attacker-chosen order.
  if (cookies.length !== 1) return null;
  const token = /^__Host-sf_session=([a-f0-9]{64})$/.exec(cookies[0])?.[1];
  return token ? createHash('sha256').update(token).digest('hex') : null;
}

export async function requireDatabaseSession(client, request, now = Date.now()) {
  const tokenHash = sessionDigest(request);
  if (!tokenHash) throw new AuthenticationError('AUTHENTICATION_REQUIRED');
  const session = await client.authSession.findUnique({ where: { tokenHash }, include: { user: true } });
  const expiry = session?.expiresAt ? new Date(session.expiresAt).getTime() : NaN;
  const emailVerifiedAt = session?.user?.emailVerifiedAt ? new Date(session.user.emailVerifiedAt).getTime() : NaN;
  if (!Number.isFinite(now) || !session || session.revokedAt || !Number.isFinite(expiry) || expiry <= now || session.user?.status !== 'ACTIVE' || !Number.isFinite(emailVerifiedAt) || emailVerifiedAt > now) throw new AuthenticationError('AUTHENTICATION_REQUIRED');
  return session;
}

export function requireRecentSessionMfa(session, now = Date.now()) {
  const verifiedAt = session?.mfaVerifiedAt ? new Date(session.mfaVerifiedAt).getTime() : NaN;
  if (!Number.isFinite(now) || !session?.user?.mfaEnabled || !Number.isFinite(verifiedAt) || verifiedAt > now || now - verifiedAt > 15 * 60000) throw new AuthenticationError('RECENT_MFA_REQUIRED', 403);
}

export function assertAuthMutation(request, env = process.env) {
  const configured = env.AUTH_ORIGIN || env.PAYMENTS_ORIGIN;
  let origin;
  try { origin = new URL(configured); } catch { throw new AuthenticationError('AUTH_ORIGIN_NOT_CONFIGURED', 503); }
  if (origin.protocol !== 'https:' || origin.origin !== configured || origin.username || origin.password) throw new AuthenticationError('AUTH_ORIGIN_NOT_CONFIGURED', 503);
  if (request.headers.get('origin') !== origin.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new AuthenticationError('REQUEST_ORIGIN_REJECTED', 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new AuthenticationError('JSON_REQUIRED', 415);
}

async function rateLimit(client, userId, maximum, scope = 'read') {
  const window = Math.floor(Date.now() / 60000);
  const key = `auth:${scope}:${userId}:${window}`;
  const record = await client.paymentRateLimit.upsert({ where: { key }, create: { key, count: 1, expiresAt: new Date((window + 2) * 60000) }, update: { count: { increment: 1 } } });
  if (record.count > maximum) throw new AuthenticationError('AUTH_RATE_LIMITED', 429);
}

export async function describeCurrentSession(client, request) {
  const session = await requireDatabaseSession(client, request);
  await rateLimit(client, session.userId, 60);
  return { authenticated: true, user: { id: session.userId, mfaEnabled: session.user.mfaEnabled }, session: { id: session.id, expiresAt: session.expiresAt } };
}

export async function listOwnSessions(client, request) {
  const current = await requireDatabaseSession(client, request);
  await rateLimit(client, current.userId, 60);
  const sessions = await client.authSession.findMany({ where: { userId: current.userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, createdAt: true, expiresAt: true, lastSeenAt: true } });
  return { sessions: sessions.map(session => ({ ...session, current: session.id === current.id })) };
}

export async function revokeCurrentSession(client, request, env = process.env) {
  assertAuthMutation(request, env);
  const tokenHash = sessionDigest(request);
  if (!tokenHash) return { loggedOut: true, revoked: false };
  return client.$transaction(async tx => {
    const session = await tx.authSession.findUnique({ where: { tokenHash } });
    if (!session) return { loggedOut: true, revoked: false };
    const result = await tx.authSession.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
    if (result.count) await tx.auditEvent.create({ data: { actorUserId: session.userId, action: 'auth.session.revoked', resource: 'auth-session', resourceId: session.id } });
    return { loggedOut: true, revoked: result.count > 0 };
  });
}

export async function revokeAllOwnSessions(client, request, env = process.env) {
  assertAuthMutation(request, env);
  const current = await requireDatabaseSession(client, request);
  requireRecentSessionMfa(current);
  await rateLimit(client, current.userId, 5, 'revoke-all');
  return client.$transaction(async tx => {
    // Recheck inside the transaction so the authorization evidence and revocation share state.
    const checked = await requireDatabaseSession(tx, request);
    requireRecentSessionMfa(checked);
    const result = await tx.authSession.updateMany({ where: { userId: checked.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorUserId: checked.userId, action: 'auth.sessions.revoked-all', resource: 'user', resourceId: checked.userId } });
    return { loggedOut: true, revokedCount: result.count };
  });
}
