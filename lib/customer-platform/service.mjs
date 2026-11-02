import { createHash, randomUUID } from 'node:crypto';
import { requireRecentSessionMfa } from '../auth/session-security.mjs';
import { PlatformError, fields, identifier, ticketContent, safeMessage, staffCategories, transition, CONTROL_KEYS, assertServiceEnabled } from './policy.mjs';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const audit = (tx, userId, action, resourceId, metadata = {}) => tx.auditEvent.create({ data: { actorUserId: userId, action, resource: 'customer-platform', resourceId, metadata } });
const lock = (tx, key) => tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtext(${key}))`;
const notify = (tx, userId, ticketId) => userId ? tx.customerNotification.create({ data: { userId, kind: 'SUPPORT_UPDATED', resourceId: ticketId } }) : undefined;
const ticketSelect = { id: true, reference: true, category: true, status: true, priority: true, subject: true, createdAt: true, updatedAt: true, firstResponseAt: true, resolvedAt: true };

export function createCustomerPlatform({ db }) {
  function staff(session) { requireRecentSessionMfa(session); return staffCategories(session.user.platformRole); }
  async function owned(tx, userId, id) {
    const ticket = await tx.supportTicket.findFirst({ where: { id: identifier(id), userId } });
    if (!ticket) throw new PlatformError('SUPPORT_TICKET_NOT_FOUND', 404);
    return ticket;
  }
  async function staffTicket(tx, session, id) {
    const categories = staff(session);
    const ticket = await tx.supportTicket.findFirst({ where: { id: identifier(id), category: { in: categories } } });
    if (!ticket) throw new PlatformError('SUPPORT_TICKET_NOT_FOUND', 404);
    return ticket;
  }
  return {
    async list(session) {
      return { tickets: await db.supportTicket.findMany({ where: { userId: session.userId }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 100, select: ticketSelect }), limit: 100 };
    },
    async detail(session, id, asStaff = false) {
      const ticket = asStaff ? await staffTicket(db, session, id) : await owned(db, session.userId, id);
      const messages = await db.supportMessage.findMany({ where: { ticketId: ticket.id, ...(asStaff ? {} : { internal: false }) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100, select: { id: true, authorType: true, body: true, internal: true, createdAt: true } });
      await audit(db, session.userId, asStaff ? 'support.staff.viewed' : 'support.customer.viewed', ticket.id);
      return { ticket: Object.fromEntries(Object.keys(ticketSelect).map(key => [key, ticket[key]])), messages: messages.reverse(), limit: 100 };
    },
    async create(session, input) {
      const content = ticketContent(session.userId, input), requestHash = digest(content);
      return db.$transaction(async tx => {
        await assertServiceEnabled(tx, 'SUPPORT_WRITES');
        await lock(tx, `support-create:${session.userId}`);
        const prior = await tx.supportTicket.findUnique({ where: { userId_requestKey: { userId: session.userId, requestKey: content.requestKey } } });
        if (prior) { if (prior.requestHash !== requestHash) throw new PlatformError('IDEMPOTENCY_CONFLICT', 409); return { id: prior.id, reference: prior.reference, status: prior.status }; }
        if (await tx.supportTicket.count({ where: { userId: session.userId, status: { notIn: ['RESOLVED', 'CLOSED'] } } }) >= 20) throw new PlatformError('OPEN_TICKET_LIMIT_REACHED', 409);
        const ticket = await tx.supportTicket.create({ data: { userId: session.userId, reference: `SF-${randomUUID()}`, category: content.category, subject: content.subject, requestKey: content.requestKey, requestHash, priority: content.category === 'SECURITY' ? 'HIGH' : 'NORMAL' } });
        await tx.supportMessage.create({ data: { ticketId: ticket.id, authorType: 'CUSTOMER', authorUserId: session.userId, body: content.description } });
        await audit(tx, session.userId, 'support.ticket.created', ticket.id, { category: ticket.category });
        await notify(tx, session.userId, ticket.id);
        return { id: ticket.id, reference: ticket.reference, status: ticket.status };
      });
    },
    async reply(session, input, asStaff = false) {
      fields(input, ['ticketId', 'body', ...(asStaff ? ['internal'] : [])]);
      const text = safeMessage(input.body);
      if (asStaff && typeof input.internal !== 'boolean') throw new PlatformError('MESSAGE_VISIBILITY_REQUIRED');
      return db.$transaction(async tx => {
        await assertServiceEnabled(tx, 'SUPPORT_WRITES'); await lock(tx, `support-ticket:${identifier(input.ticketId)}`);
        const ticket = asStaff ? await staffTicket(tx, session, input.ticketId) : await owned(tx, session.userId, input.ticketId);
        if (['CLOSED','RESOLVED'].includes(ticket.status)) throw new PlatformError('TICKET_NOT_ACCEPTING_REPLIES', 409);
        const message = await tx.supportMessage.create({ data: { ticketId: ticket.id, authorType: asStaff ? 'STAFF' : 'CUSTOMER', authorUserId: session.userId, internal: asStaff && input.internal, body: text } });
        const externalStaff = asStaff && !input.internal;
        const status = !asStaff && ticket.status === 'WAITING_FOR_CUSTOMER' ? 'TRIAGED' : ticket.status;
        await tx.supportTicket.update({ where: { id: ticket.id }, data: { status, updatedAt: new Date(), ...(externalStaff && !ticket.firstResponseAt ? { firstResponseAt: new Date() } : {}) } });
        await audit(tx, session.userId, 'support.message.created', ticket.id, { internal: asStaff && input.internal });
        if (externalStaff) await notify(tx, ticket.userId, ticket.id);
        return { id: message.id, status };
      });
    },
    async setStatus(session, input, asStaff = false) {
      fields(input, ['ticketId', 'status']);
      return db.$transaction(async tx => {
        await assertServiceEnabled(tx, 'SUPPORT_WRITES'); await lock(tx, `support-ticket:${identifier(input.ticketId)}`);
        const ticket = asStaff ? await staffTicket(tx, session, input.ticketId) : await owned(tx, session.userId, input.ticketId);
        const status = transition(asStaff ? session.user.platformRole : 'CUSTOMER', ticket, input.status, !asStaff);
        await tx.supportTicket.update({ where: { id: ticket.id }, data: { status, resolvedAt: ['RESOLVED','CLOSED'].includes(status) ? new Date() : null } });
        await audit(tx, session.userId, 'support.status.changed', ticket.id, { from: ticket.status, to: status });
        await notify(tx, ticket.userId, ticket.id); return { status };
      });
    },
    async notifications(session) {
      return { notifications: await db.customerNotification.findMany({ where: { userId: session.userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100, select: { id: true, kind: true, resourceId: true, createdAt: true, readAt: true } }), limit: 100 };
    },
    async markRead(session, input) {
      fields(input, ['notificationId']);
      return db.$transaction(async tx => {
        const id = identifier(input.notificationId);
        const notification = await tx.customerNotification.findFirst({ where: { id, userId: session.userId } });
        if (!notification) throw new PlatformError('NOTIFICATION_NOT_FOUND', 404);
        if (!notification.readAt) { await tx.customerNotification.update({ where: { id }, data: { readAt: new Date() } }); await audit(tx, session.userId, 'notification.read', id); }
        return { read: true };
      });
    },
    async commandCentre(session) {
      const categories = staff(session);
      const tickets = await db.supportTicket.findMany({ where: { category: { in: categories } }, orderBy: { updatedAt: 'desc' }, take: 100, select: ticketSelect });
      await audit(db, session.userId, 'command-centre.viewed', null);
      if (session.user.platformRole !== 'OWNER') return { tickets, limit: 100 };
      const [controls, recentAudit, counts] = await Promise.all([
        db.serviceControl.findMany({ where: { key: { in: CONTROL_KEYS } } }),
        db.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, action: true, resource: true, resourceId: true, severity: true, createdAt: true } }),
        Promise.all([db.user.count(), db.sfWalletAddress.count({ where: { archivedAt: null } }), db.premiumSubscription.count(), db.challenge.count()]),
      ]);
      return { tickets, controls, recentAudit, counts: { customers: counts[0], trackedAddresses: counts[1], subscriptionRecords: counts[2], challengeRecords: counts[3] }, limit: 100, financialActivationAllowed: false };
    },
    async emergencyStop(session, input) {
      fields(input, ['key', 'reasonCode']); requireRecentSessionMfa(session);
      if (session.user.platformRole !== 'OWNER') throw new PlatformError('PLATFORM_OWNER_REQUIRED', 403);
      if (!CONTROL_KEYS.includes(input.key) || !['SECURITY_INCIDENT','PROVIDER_OUTAGE','MAINTENANCE','OWNER_REVIEW'].includes(input.reasonCode)) throw new PlatformError('INVALID_SERVICE_STOP');
      return db.$transaction(async tx => {
        const result = await tx.serviceControl.upsert({ where: { key: input.key }, create: { key: input.key, disabled: true, reasonCode: input.reasonCode, disabledBy: session.userId }, update: { disabled: true, reasonCode: input.reasonCode, disabledBy: session.userId } });
        await audit(tx, session.userId, 'service.emergency.disabled', input.key, { reasonCode: input.reasonCode });
        return { key: result.key, disabled: true };
      });
    },
  };
}
