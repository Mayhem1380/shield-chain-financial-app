import { validateTicketIntake, evaluateTicketTransition } from '../support-ticket-policy.mjs';
export class PlatformError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function fields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) throw new PlatformError('UNSUPPORTED_CUSTOMER_INPUT');
}
export function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw new PlatformError('RESOURCE_ID_REQUIRED');
  return value;
}
const categoryMap = Object.freeze({ ACCOUNT_ACCESS: 'ACCOUNT_ACCESS', SECURITY: 'SECURITY_INCIDENT', EXCHANGE: 'TRADING', WALLET: 'TECHNICAL', CHALLENGE: 'TRADING', PAYMENTS: 'PAYMENTS', FEEDBACK: 'FEEDBACK', OTHER: 'OTHER' });
export function ticketContent(userId, input) {
  fields(input, ['category', 'subject', 'description', 'requestKey']);
  if (!Object.hasOwn(categoryMap, input.category)) throw new PlatformError('CATEGORY_INVALID');
  if (typeof input.requestKey !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(input.requestKey)) throw new PlatformError('IDEMPOTENCY_KEY_REQUIRED');
  const result = validateTicketIntake({ userId, category: categoryMap[input.category], subject: input.subject, description: input.description });
  if (!result.allowed) throw new PlatformError(result.code);
  safeMessage(result.subject); safeMessage(result.description);
  return { category: input.category, subject: result.subject, description: result.description, requestKey: input.requestKey };
}
export function safeMessage(value) {
  if (typeof value !== 'string' || value.trim().length < 4 || value.length > 5000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new PlatformError('MESSAGE_INVALID');
  // Defence in depth, not a universal secret detector. UI must also warn customers.
  if (/(private[ -]?key|seed[ -]?phrase|recovery[ -]?phrase|password\s*(is|:|=)|otp\s*(is|:|=)|\b(?:sk|rk)_(?:live|test)_|\bwhsec_|-----BEGIN.*PRIVATE KEY|\b0x[a-f0-9]{64}\b)/i.test(value)) throw new PlatformError('SENSITIVE_SECRET_CONTENT_BLOCKED');
  return value.trim();
}
export function staffCategories(role) {
  if (role === 'OWNER') return Object.keys(categoryMap);
  if (role === 'SECURITY') return ['SECURITY', 'ACCOUNT_ACCESS'];
  if (role === 'OPERATIONS') return ['PAYMENTS', 'EXCHANGE', 'CHALLENGE'];
  if (role === 'SUPPORT') return ['ACCOUNT_ACCESS', 'WALLET', 'FEEDBACK', 'OTHER'];
  throw new PlatformError('PLATFORM_STAFF_REQUIRED', 403);
}
export function transition(role, ticket, toStatus, owner = false) {
  const actorRole = { CUSTOMER: 'CUSTOMER', SUPPORT: 'SUPPORT_AGENT', SECURITY: 'SECURITY_ANALYST', OPERATIONS: 'FINANCIAL_OPERATIONS', OWNER: 'SUPPORT_LEAD' }[role];
  if (!actorRole || !['OPEN','TRIAGED','WAITING_FOR_CUSTOMER','ESCALATED','RESOLVED','CLOSED'].includes(toStatus)) throw new PlatformError('STATUS_INVALID');
  const result = evaluateTicketTransition({ actorRole, isOwner: owner, category: categoryMap[ticket.category], fromStatus: ticket.status === 'TRIAGED' ? 'IN_PROGRESS' : ticket.status, toStatus: toStatus === 'TRIAGED' ? 'IN_PROGRESS' : toStatus });
  if (!result.allowed) throw new PlatformError(result.code, 409);
  return toStatus;
}
export const CONTROL_KEYS = Object.freeze(['SUPPORT_WRITES', 'WALLET_REFRESH', 'BILLING_CHECKOUT']);
export async function assertServiceEnabled(db, key) {
  if (!CONTROL_KEYS.includes(key)) throw new PlatformError('SERVICE_CONTROL_INVALID');
  const control = await db.serviceControl.findUnique({ where: { key } });
  if (control?.disabled) throw new PlatformError('SERVICE_EMERGENCY_DISABLED', 503);
  // Absence means no emergency stop; all pre-existing activation gates still apply.
}
