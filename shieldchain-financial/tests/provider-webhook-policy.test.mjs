import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProviderWebhook, evaluateWebhookStateChange } from '../lib/provider-webhook-policy.mjs';
const now = 1_800_000_000_000;
const valid = { signatureVerified: true, eventId: 'evt_12345678', eventType: 'payment.status.updated', timestampSeconds: now / 1000, alreadyProcessed: false, provider: 'provider_test' };
test('admits a verified, recent, allowlisted, not-yet-processed event', () => assert.equal(evaluateProviderWebhook(valid, { now }).allowed, true));
test('rejects unverified signatures', () => assert.equal(evaluateProviderWebhook({ ...valid, signatureVerified: false }, { now }).code, 'WEBHOOK_SIGNATURE_NOT_VERIFIED'));
test('rejects duplicate delivery', () => assert.equal(evaluateProviderWebhook({ ...valid, alreadyProcessed: true }, { now }).code, 'WEBHOOK_REPLAY_DETECTED'));
test('fails closed when idempotency state is unknown', () => assert.equal(evaluateProviderWebhook({ ...valid, alreadyProcessed: undefined }, { now }).code, 'WEBHOOK_IDEMPOTENCY_STATE_UNKNOWN'));
test('rejects stale events', () => assert.equal(evaluateProviderWebhook({ ...valid, timestampSeconds: valid.timestampSeconds - 600 }, { now }).code, 'WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW'));
test('rejects unknown event types', () => assert.equal(evaluateProviderWebhook({ ...valid, eventType: 'payment.execute.anything' }, { now }).code, 'WEBHOOK_EVENT_TYPE_NOT_ALLOWED'));
test('rejects invalid event IDs', () => assert.equal(evaluateProviderWebhook({ ...valid, eventId: 'x' }, { now }).code, 'WEBHOOK_EVENT_ID_INVALID'));
test('requires atomically claimed idempotency and server-loaded target', () => {
  assert.equal(evaluateWebhookStateChange({ admissionAllowed: true, signatureVerified: true, eventPersisted: true, idempotencyClaimedAtomically: true, targetResourceLoadedServerSide: false, transitionAllowed: true }).code, 'WEBHOOK_RESOURCE_CONTEXT_UNAVAILABLE');
});
test('does not permit state changes before prerequisites are complete', () => assert.equal(evaluateWebhookStateChange({ admissionAllowed: true }).code, 'WEBHOOK_PROCESSING_PREREQUISITES_MISSING'));
test('admits state change only when all prerequisites are explicitly true', () => assert.equal(evaluateWebhookStateChange({ admissionAllowed: true, signatureVerified: true, eventPersisted: true, idempotencyClaimedAtomically: true, targetResourceLoadedServerSide: true, transitionAllowed: true }).allowed, true));
