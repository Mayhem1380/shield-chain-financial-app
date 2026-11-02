import test from 'node:test';
import assert from 'node:assert/strict';
import { walletAggregatorStatus, createWalletAggregatorBoundary } from '../lib/integrations/wallet-aggregator.mjs';

// Protocol fixtures, not assertions about the uninspected Replit application's features.
function fixture() {
  const events = []; const calls = [];
  const config = {
    review: { sourceRevision: 'a'.repeat(40), sourceReference: 'fixture-only', reviewReference: 'fixture-review', readOnlyCredentialReviewReference: 'fixture-scope', reviewedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), capabilities: [{ name: 'fixture_read', effect: 'READ', responseFields: ['result'] }] },
    resolveSubject: async () => ({ verified: true, active: true, userId: 'fixture-user', providerSubject: 'server-owned-subject' }),
    adapter: { read: async input => { calls.push(input); return { result: 'fixture', extra: 'not-allowlisted' }; } },
    audit: async event => events.push(event),
  };
  return { config, events, calls };
}

test('existing Wallet Aggregator remains uninspected and disabled by default', async () => {
  assert.deepEqual(walletAggregatorStatus().enabledCapabilities, []);
  assert.equal(walletAggregatorStatus().transactionsEnabled, false);
  await assert.rejects(createWalletAggregatorBoundary({}).read({ capability: 'fixture_read' }), /SOURCE_REVIEW_REQUIRED/);
});
test('boundary only invokes a reviewed READ operation using server-resolved ownership', async () => {
  const { config, events, calls } = fixture();
  const result = await createWalletAggregatorBoundary(config).read({ request: {}, capability: 'fixture_read', providerSubject: 'attacker-subject' });
  assert.deepEqual(result, { result: 'fixture' });
  assert.equal(calls[0].subjectReference, 'server-owned-subject');
  assert.equal(events[0].action, 'wallet.read.completed');
  assert.equal(Object.hasOwn(events[0], 'result'), false);
});
test('unreviewed capabilities, transaction contracts and expired reviews cannot run', async () => {
  const { config, calls } = fixture();
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'unknown_read' }), /NOT_REVIEWED/);
  config.review.capabilities[0].effect = 'WRITE';
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'fixture_read' }), /READ_CONTRACT_REQUIRED/);
  config.review.capabilities[0].effect = 'READ'; config.review.expiresAt = new Date(0).toISOString();
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'fixture_read' }), /SOURCE_REVIEW_REQUIRED/);
  assert.equal(calls.length, 0);
});
test('unverified or foreign ownership cannot reach the adapter', async () => {
  const { config, calls } = fixture(); config.resolveSubject = async () => ({ verified: false });
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'fixture_read' }), /VERIFIED_OWNER_REQUIRED/);
  assert.equal(calls.length, 0);
});
test('nested secrets and oversized data fail closed, and provider errors are redacted', async () => {
  const { config, events } = fixture();
  config.adapter.read = async () => ({ result: { privateKey: 'fixture' } });
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'fixture_read' }), /SENSITIVE_RESPONSE_REJECTED/);
  config.adapter.read = async () => ({ result: 'x'.repeat(65537) });
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'fixture_read' }), /TOO_LARGE/);
  config.adapter.read = async () => { throw Error('private provider error'); };
  await assert.rejects(createWalletAggregatorBoundary(config).read({ capability: 'fixture_read' }), /PROVIDER_UNAVAILABLE/);
  assert.equal(JSON.stringify(events).includes('private provider error'), false);
});
