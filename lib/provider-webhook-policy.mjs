/** Provider webhook admission policy only. Signature verification, persistence and execution belong in trusted server adapters. */
const allowedTypes = new Set([
  'identity.verification.updated',
  'payment.status.updated',
  'payout.status.updated',
  'custody.transfer.status.updated'
]);
const deny = (code) => ({ allowed: false, code });

export function evaluateProviderWebhook(input, { now = Date.now(), toleranceSeconds = 300 } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('WEBHOOK_CONTEXT_INVALID');
  if (input.signatureVerified !== true) return deny('WEBHOOK_SIGNATURE_NOT_VERIFIED');
  if (!Number.isFinite(now) || !Number.isInteger(toleranceSeconds) || toleranceSeconds < 1 || toleranceSeconds > 900) return deny('WEBHOOK_CLOCK_POLICY_INVALID');
  if (typeof input.eventId !== 'string' || !/^[a-zA-Z0-9_.:-]{8,200}$/.test(input.eventId)) return deny('WEBHOOK_EVENT_ID_INVALID');
  if (!allowedTypes.has(input.eventType)) return deny('WEBHOOK_EVENT_TYPE_NOT_ALLOWED');
  if (!Number.isInteger(input.timestampSeconds) || Math.abs(Math.floor(now / 1000) - input.timestampSeconds) > toleranceSeconds) return deny('WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW');
  if (input.alreadyProcessed === true) return deny('WEBHOOK_REPLAY_DETECTED');
  if (input.alreadyProcessed !== false) return deny('WEBHOOK_IDEMPOTENCY_STATE_UNKNOWN');
  if (typeof input.provider !== 'string' || !/^[a-zA-Z0-9_-]{2,60}$/.test(input.provider)) return deny('WEBHOOK_PROVIDER_INVALID');
  return { allowed: true, code: 'WEBHOOK_ADMITTED_FOR_IDEMPOTENT_PROCESSING', eventId: input.eventId, eventType: input.eventType, provider: input.provider };
}

export function evaluateWebhookStateChange(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('WEBHOOK_CHANGE_CONTEXT_INVALID');
  if (input.admissionAllowed !== true) return deny('WEBHOOK_NOT_ADMITTED');
  if (input.signatureVerified !== true || input.eventPersisted !== true || input.idempotencyClaimedAtomically !== true) return deny('WEBHOOK_PROCESSING_PREREQUISITES_MISSING');
  if (input.targetResourceLoadedServerSide !== true) return deny('WEBHOOK_RESOURCE_CONTEXT_UNAVAILABLE');
  if (input.transitionAllowed !== true) return deny('WEBHOOK_STATE_TRANSITION_DENIED');
  return { allowed: true, code: 'WEBHOOK_STATE_CHANGE_POLICY_ALLOWED' };
}
