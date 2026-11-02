import { randomUUID } from 'node:crypto';
import { paymentDb, readLimited } from '../payments/runtime.mjs';
import { requireDatabaseSession, assertAuthMutation, AuthenticationError } from '../auth/session-security.mjs';
import { PlatformError } from './policy.mjs';
import { createCustomerPlatform } from './service.mjs';
import { createEarnReviewLedger } from '../locked-earn/review-ledger.mjs';
const mutations = new Set(['create','reply','status','markRead','staffReply','staffStatus','stop']);
export async function customerResponse(action, request) {
  const requestId = randomUUID(), headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Request-ID': requestId };
  let db, session;
  try {
    if (mutations.has(action)) assertAuthMutation(request);
    db = await paymentDb(); session = await requireDatabaseSession(db, request);
    const minute = Math.floor(Date.now() / 60000), maximum = mutations.has(action) ? 10 : 60;
    const key = `customer-platform:${mutations.has(action) ? 'write' : 'read'}:${session.userId}:${minute}`;
    const counter = await db.paymentRateLimit.upsert({ where: { key }, create: { key, count: 1, expiresAt: new Date((minute + 2) * 60000) }, update: { count: { increment: 1 } } });
    if (counter.count > maximum) throw new PlatformError('CUSTOMER_RATE_LIMITED', 429);
    let input = {};
    if (mutations.has(action)) {
      try { input = JSON.parse((await readLimited(request, 12000)).toString('utf8')); }
      catch (error) { throw new PlatformError(error.code === 'REQUEST_TOO_LARGE' ? 'REQUEST_TOO_LARGE' : 'INVALID_JSON', error.code === 'REQUEST_TOO_LARGE' ? 413 : 400); }
    }
    const service = createCustomerPlatform({ db }), id = new URL(request.url).searchParams.get('ticketId');
    const handlers = {
      list: () => service.list(session), detail: () => service.detail(session, id),
      create: () => service.create(session, input), reply: () => service.reply(session, input), status: () => service.setStatus(session, input),
      notifications: () => service.notifications(session), markRead: () => service.markRead(session, input),
      command: () => service.commandCentre(session), staffDetail: () => service.detail(session, id, true),
      earnHistory: () => {
        const ledger = createEarnReviewLedger({ db }), planId = new URL(request.url).searchParams.get('planId');
        return planId ? ledger.history(session.userId, planId) : ledger.plans(session.userId);
      },
      staffReply: () => service.reply(session, input, true), staffStatus: () => service.setStatus(session, input, true), stop: () => service.emergencyStop(session, input),
    };
    if (!Object.hasOwn(handlers, action)) throw new PlatformError('CUSTOMER_ACTION_NOT_FOUND', 404);
    return Response.json(await handlers[action](), { headers });
  } catch (error) {
    const known = error instanceof PlatformError || error instanceof AuthenticationError;
    if (db && session) { try { await db.auditEvent.create({ data: { actorUserId: session.userId, action: 'customer-platform.request.rejected', resource: 'customer-platform', requestId, severity: 'WARNING', metadata: { operation: action, code: known ? error.code : 'CUSTOMER_PLATFORM_UNAVAILABLE' } } }); } catch {} }
    return Response.json({ error: known ? error.code : 'CUSTOMER_PLATFORM_UNAVAILABLE', requestId }, { status: known ? error.status : 503, headers });
  }
}
