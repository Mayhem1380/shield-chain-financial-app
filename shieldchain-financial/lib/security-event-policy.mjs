/** Privacy-preserving event envelope policy; persistence/transport must be implemented server-side. */
const allowedEvents = new Set([
  'AUTH_SIGN_IN_DENIED', 'AUTH_SIGN_IN_SUCCEEDED', 'AUTH_MFA_DENIED',
  'AUTH_PASSWORD_RESET_REQUESTED', 'AUTH_TOKEN_REJECTED', 'ACCESS_DENIED',
  'SESSION_REVOKED', 'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_TRANSITION_DENIED',
  'WITHDRAWAL_REVIEW_REQUIRED', 'RATE_LIMIT_TRIGGERED', 'SECURITY_CONFIGURATION_ERROR'
]);
const sensitiveKey = /password|secret|token|authorization|cookie|private.?key|seed|mnemonic|email|phone|address|ip|wallet|accountnumber|payment|card|message|body|content/i;
const safeKey = /^[a-z][a-zA-Z0-9_]{0,39}$/;
const safeValue = (value) => typeof value === 'string' && value.length <= 100 && /^[A-Z0-9_.:-]+$/i.test(value);
const deny = (code) => ({ allowed: false, code });

export function buildSecurityEvent(input, { now = Date.now() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('EVENT_CONTEXT_INVALID');
  if (!allowedEvents.has(input.type)) return deny('EVENT_TYPE_NOT_ALLOWED');
  if (!Number.isFinite(now)) return deny('EVENT_CLOCK_INVALID');
  if (typeof input.correlationId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(input.correlationId)) return deny('CORRELATION_ID_INVALID');
  if (input.actorId !== undefined && (typeof input.actorId !== 'string' || input.actorId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(input.actorId))) return deny('ACTOR_ID_INVALID');
  const metadata = {};
  if (input.metadata !== undefined) {
    if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) return deny('METADATA_INVALID');
    const entries = Object.entries(input.metadata);
    if (entries.length > 12) return deny('METADATA_TOO_LARGE');
    for (const [key, value] of entries) {
      if (!safeKey.test(key)) return deny('METADATA_KEY_INVALID');
      if (sensitiveKey.test(key)) continue;
      if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) metadata[key] = value;
      else if (safeValue(value)) metadata[key] = value;
      else return deny('METADATA_VALUE_INVALID');
    }
  }
  return { allowed: true, event: { type: input.type, occurredAt: new Date(now).toISOString(), correlationId: input.correlationId, ...(input.actorId ? { actorId: input.actorId } : {}), metadata } };
}

export function redactForSecurityLog(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return '[REDACTED]';
  const output = {};
  for (const [key, value] of Object.entries(input).slice(0, 40)) {
    if (sensitiveKey.test(key)) { output[key] = '[REDACTED]'; continue; }
    if (value && typeof value === 'object') output[key] = '[OMITTED_OBJECT]';
    else if (typeof value === 'string') output[key] = value.slice(0, 160);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
    else output[key] = '[OMITTED]';
  }
  return output;
}
