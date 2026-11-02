import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { billingIdentity } from '../lib/payments/runtime.mjs';
import { revokeCurrentSession } from '../lib/auth/session-security.mjs';
import { createSfWalletService } from '../lib/sf-wallet/service.mjs';

// Never run this suite against a customer database. CI provisions a disposable instance.
test('isolated PostgreSQL migration and billing behaviour', { skip: process.env.SHIELDCHAIN_DATABASE_TESTS !== '1' }, async t => {
  const url = new URL(process.env.DATABASE_URL || 'https://invalid.local');
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Only a local disposable DB is permitted');
  assert.equal(url.pathname, '/shieldchain_validation', 'Refusing a non-validation database');
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient();
  const marker = randomUUID().replaceAll('-', '');
  const productCode = `VERIFY_${marker}`;
  let user;
  try {
    user = await client.user.create({ data: { email: `${marker}@validation.invalid`, status: 'ACTIVE', emailVerifiedAt: new Date(), mfaEnabled: true } });
    await client.paymentProduct.create({ data: { code: productCode, title: 'Isolated DB test fixture', purpose: 'SOFTWARE_ACCESS', priceId: 'price_fixtureOnly', amountMinor: 995, currency: 'aud', enabled: false, live: false } });
    const orderData = { userId: user.id, productCode, requestKey: `verify-${marker}`, priceId: 'price_fixtureOnly', amountMinor: 995, currency: 'aud', live: false };
    await t.test('duplicate checkout reservations are constrained by the real database', async () => {
      const results = await Promise.allSettled([client.paymentOrder.create({ data: orderData }), client.paymentOrder.create({ data: orderData })]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === 'P2002').length, 1);
    });
    const order = await client.paymentOrder.findUniqueOrThrow({ where: { requestKey: orderData.requestKey } });
    await t.test('event/audit/order changes roll back together', async () => {
      await assert.rejects(client.$transaction(async tx => {
        await tx.paymentOrder.update({ where: { id: order.id }, data: { status: 'PAID' } });
        await tx.auditEvent.create({ data: { action: 'verify.rollback', resource: 'payment', resourceId: order.id, requestId: marker } });
        throw Error('intentional-fixture-rollback');
      }), /intentional-fixture-rollback/);
      assert.equal((await client.paymentOrder.findUniqueOrThrow({ where: { id: order.id } })).status, 'CREATING');
      assert.equal(await client.auditEvent.count({ where: { requestId: marker } }), 0);
    });
    await t.test('concurrent webhook replay applies one atomic state change', async () => {
      const eventId = `evt_${marker}`;
      const apply = () => client.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtext(${order.id}))`;
        if (await tx.paymentEvent.findUnique({ where: { eventId } })) return false;
        await tx.paymentOrder.update({ where: { id: order.id }, data: { status: 'PAID' } });
        await tx.paymentEvent.create({ data: { eventId, orderId: order.id, eventType: 'fixture.only', bodyHash: marker } });
        await tx.auditEvent.create({ data: { action: 'verify.applied', resource: 'payment', resourceId: order.id, requestId: marker } });
        return true;
      });
      const results = await Promise.all([apply(), apply()]);
      assert.equal(results.filter(Boolean).length, 1);
      assert.equal(await client.paymentEvent.count({ where: { eventId } }), 1);
      assert.equal(await client.auditEvent.count({ where: { requestId: marker } }), 1);
    });
    await t.test('billing authentication reads real expiry and revocation records', async () => {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const session = await client.authSession.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60000), mfaVerifiedAt: new Date() } });
      const request = new Request('https://validation.invalid/api/billing/payments', { headers: { cookie: `__Host-sf_session=${token}` } });
      assert.equal((await billingIdentity(request, client)).id, user.id);
      await client.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      await assert.rejects(billingIdentity(request, client), /AUTHENTICATION_REQUIRED/);
      await client.authSession.update({ where: { id: session.id }, data: { revokedAt: null } });
      const logout = new Request('https://validation.invalid/api/auth/logout', { method: 'POST', headers: { cookie: `__Host-sf_session=${token}`, origin: 'https://validation.invalid', 'content-type': 'application/json' }, body: '{}' });
      assert.equal((await revokeCurrentSession(client, logout, { AUTH_ORIGIN: 'https://validation.invalid' })).revoked, true);
      await assert.rejects(billingIdentity(request, client), /AUTHENTICATION_REQUIRED/);
    });
    await t.test('SF Wallet tracking creates only owned metadata and blocks foreign account access', async () => {
      const service = createSfWalletService({ db: client });
      const tracked = await service.track(user.id, { chainKey: 'ethereum', publicAddress: '0x' + '1'.repeat(40), label: 'Isolated database fixture' });
      assert.equal(tracked.snapshots.length, 0);
      assert.equal((await client.sfWalletVault.findUniqueOrThrow({ where: { userId: user.id } })).status, 'METADATA_ONLY');
      await assert.rejects(service.history('foreign-fixture-user', tracked.id), /NOT_FOUND/);
      await assert.rejects(service.exportCsv('foreign-fixture-user', tracked.id), /NOT_FOUND/);
      assert.match(await service.qrPayload(user.id, tracked.id), /^ethereum:0x/);
    });
  } finally {
    if (user) {
      await client.sfWalletTransaction.deleteMany({ where: { address: { userId: user.id } } });
      await client.sfWalletSnapshot.deleteMany({ where: { address: { userId: user.id } } });
      await client.sfWalletAddress.deleteMany({ where: { userId: user.id } });
      await client.sfWalletVault.deleteMany({ where: { userId: user.id } });
      const orders = await client.paymentOrder.findMany({ where: { userId: user.id }, select: { id: true } });
      await client.paymentEvent.deleteMany({ where: { orderId: { in: orders.map(order => order.id) } } });
      await client.paymentOrder.deleteMany({ where: { userId: user.id } });
      await client.auditEvent.deleteMany({ where: { requestId: marker } });
      await client.auditEvent.deleteMany({ where: { actorUserId: user.id } });
      await client.paymentRateLimit.deleteMany({ where: { key: { startsWith: `user:${user.id}:` } } });
      await client.authSession.deleteMany({ where: { userId: user.id } });
      await client.user.delete({ where: { id: user.id } });
      await client.paymentProduct.deleteMany({ where: { code: productCode } });
    }
    await client.$disconnect();
  }
});
