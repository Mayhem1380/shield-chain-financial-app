/** Ticket workflow decisions only; callers must authenticate, load records server-side and persist atomically. */
const transitions = {
  OPEN: new Set(['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED']),
  IN_PROGRESS: new Set(['WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED']),
  WAITING_FOR_CUSTOMER: new Set(['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']),
  ESCALATED: new Set(['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']),
  RESOLVED: new Set(['IN_PROGRESS', 'CLOSED']),
  CLOSED: new Set()
};
const categories = new Set(['ACCOUNT_ACCESS', 'IDENTITY', 'SECURITY_INCIDENT', 'PAYMENTS', 'WITHDRAWAL', 'TRADING', 'EDUCATION', 'TECHNICAL', 'FEEDBACK', 'OTHER']);
const deny = (code) => ({ allowed: false, code });
export function evaluateTicketTransition(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('TICKET_CONTEXT_INVALID');
  if (!['CUSTOMER', 'SUPPORT_AGENT', 'SUPPORT_LEAD', 'SECURITY_ANALYST', 'FINANCIAL_OPERATIONS'].includes(input.actorRole)) return deny('ACTOR_ROLE_INVALID');
  if (!Object.hasOwn(transitions, input.fromStatus) || !Object.hasOwn(transitions, input.toStatus)) return deny('STATUS_INVALID');
  if (input.actorRole === 'CUSTOMER' && input.isOwner !== true) return deny('TICKET_NOT_OWNED');
  if (input.actorRole === 'CUSTOMER' && !['RESOLVED', 'CLOSED'].includes(input.toStatus)) return deny('CUSTOMER_TRANSITION_NOT_ALLOWED');
  if (['SECURITY_INCIDENT', 'PAYMENTS', 'WITHDRAWAL'].includes(input.category) && input.actorRole === 'SUPPORT_AGENT') return deny('RESTRICTED_QUEUE_ROLE_REQUIRED');
  if (!transitions[input.fromStatus].has(input.toStatus)) return deny('TRANSITION_NOT_ALLOWED');
  if (input.fromStatus === 'CLOSED' && input.toStatus !== 'CLOSED') return deny('CLOSED_TICKET_TERMINAL');
  return { allowed: true, code: 'TICKET_TRANSITION_ALLOWED', fromStatus: input.fromStatus, toStatus: input.toStatus };
}
export function validateTicketIntake(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('TICKET_INPUT_INVALID');
  if (typeof input.userId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.userId)) return deny('USER_ID_INVALID');
  if (!categories.has(input.category)) return deny('CATEGORY_INVALID');
  if (typeof input.subject !== 'string' || input.subject.trim().length < 4 || input.subject.trim().length > 120) return deny('SUBJECT_INVALID');
  if (typeof input.description !== 'string' || input.description.trim().length < 10 || input.description.length > 5000) return deny('DESCRIPTION_INVALID');
  if (/(seed phrase|recovery phrase|private key|password is|my password|one-time code|otp is)/i.test(input.description)) return deny('SENSITIVE_SECRET_CONTENT_BLOCKED');
  const queue = input.category === 'SECURITY_INCIDENT' ? 'RESTRICTED_SECURITY' : ['PAYMENTS', 'WITHDRAWAL', 'TRADING'].includes(input.category) ? 'RESTRICTED_FINANCIAL_OPERATIONS' : ['ACCOUNT_ACCESS', 'IDENTITY'].includes(input.category) ? 'ACCOUNT_SUPPORT' : 'STANDARD_SUPPORT';
  return { allowed: true, code: 'TICKET_INTAKE_VALID', queue, subject: input.subject.trim(), description: input.description.trim() };
}
export function canReadTicketMessage({ actorRole, visibility, isOwner = false, hasRestrictedQueueAccess = false } = {}) {
  if (!['CUSTOMER', 'SUPPORT_AGENT', 'SUPPORT_LEAD', 'SECURITY_ANALYST', 'FINANCIAL_OPERATIONS'].includes(actorRole)) return false;
  if (visibility === 'PUBLIC') return actorRole !== 'CUSTOMER' || isOwner;
  if (visibility !== 'INTERNAL') return false;
  return actorRole !== 'CUSTOMER' && hasRestrictedQueueAccess === true;
}
