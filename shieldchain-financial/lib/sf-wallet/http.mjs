import { randomUUID } from 'node:crypto';
import { paymentDb, readLimited } from '../payments/runtime.mjs';
import { AuthenticationError, requireDatabaseSession, assertAuthMutation, requireRecentSessionMfa } from '../auth/session-security.mjs';
import { SfWalletError } from './policy.mjs';
import { createSfWalletService } from './service.mjs';
import { assertServiceEnabled, PlatformError } from '../customer-platform/policy.mjs';

const inputs = { track: ['chainKey', 'publicAddress', 'label'], archive: ['addressId'], refresh: ['addressId'], exchange: ['connectionId'] };
async function body(request, action) {
  let input;
  try { input = JSON.parse((await readLimited(request, 4096)).toString('utf8')); } catch { throw new SfWalletError('INVALID_WALLET_INPUT'); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !inputs[action]?.includes(key))) throw new SfWalletError('UNSUPPORTED_WALLET_INPUT');
  return input;
}
async function rate(client, userId, action) {
  const bucket = ['refresh', 'exchange'].includes(action) ? 'refresh' : action === 'export' ? 'export' : inputs[action] ? 'write' : 'read';
  const maximum = { refresh: 3, export: 5, write: 10, read: 60 }[bucket];
  const window = Math.floor(Date.now() / 60000), key = `sf-wallet:${bucket}:${userId}:${window}`;
  const counter = await client.paymentRateLimit.upsert({ where: { key }, create: { key, count: 1, expiresAt: new Date((window + 2) * 60000) }, update: { count: { increment: 1 } } });
  if (counter.count > maximum) throw new SfWalletError('WALLET_RATE_LIMITED', 429);
}

export async function sfWalletResponse(action, request) {
  const headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Request-ID': randomUUID() };
  let client, actorUserId;
  try {
    if (inputs[action]) assertAuthMutation(request);
    const db = await paymentDb();
    const session = await requireDatabaseSession(db, request);
    client = db; actorUserId = session.userId;
    if (['archive', 'exchange'].includes(action)) requireRecentSessionMfa(session);
    await rate(db, session.userId, action);
    if (['refresh', 'exchange'].includes(action)) await assertServiceEnabled(db, 'WALLET_REFRESH');
    const service = createSfWalletService({ db });
    const queryId = new URL(request.url).searchParams.get('addressId');
    let data;
    if (action === 'portfolio') data = await service.portfolio(session.userId);
    else if (action === 'history') data = await service.history(session.userId, queryId);
    else if (action === 'track') data = await service.track(session.userId, await body(request, action));
    else if (action === 'archive') data = await service.archive(session.userId, (await body(request, action)).addressId);
    else if (action === 'refresh') data = await service.refresh(session.userId, (await body(request, action)).addressId);
    else if (action === 'exchange') data = await service.refreshExchange(session.userId, (await body(request, action)).connectionId);
    else if (action === 'export') return new Response(await service.exportCsv(session.userId, queryId), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sf-wallet-transactions.csv"' } });
    else if (action === 'qr') {
      const payload = await service.qrPayload(session.userId, queryId);
      let qr;
      try { qr = await import('qrcode'); } catch { throw new SfWalletError('QR_ENCODER_NOT_INSTALLED', 503); }
      const svg = await (qr.default || qr).toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#05080d', light: '#ffffff' } });
      return new Response(svg, { headers: { ...headers, 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff' } });
    } else throw new SfWalletError('WALLET_ACTION_DISABLED', 403);
    return Response.json(data, { headers });
  } catch (error) {
    const known = error instanceof SfWalletError || error instanceof AuthenticationError || error instanceof PlatformError;
    if (client && actorUserId) {
      try { await client.auditEvent.create({ data: { actorUserId, action: 'sf-wallet.request.rejected', resource: 'sf-wallet', severity: 'WARNING', requestId: headers['X-Request-ID'], metadata: { operation: action, code: known ? error.code : 'SF_WALLET_SERVICE_UNAVAILABLE' } } }); } catch {}
    }
    return Response.json({ error: known ? error.code : 'SF_WALLET_SERVICE_UNAVAILABLE' }, { status: known ? error.status : 503, headers });
  }
}
