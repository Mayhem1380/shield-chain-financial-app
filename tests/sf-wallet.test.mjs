import test from 'node:test';
import assert from 'node:assert/strict';
import { WALLET_GATES, addressFormat, checkedAddress, parsePublicAddressQr, publicAddressQr, integerQuantity, units, csvCell, transactionCsv, assertExternalVaultReference } from '../lib/sf-wallet/policy.mjs';
import { rpcReader, createChainReader, configuredRpcUrls, discoverTransactionHashes, boundedJson } from '../lib/sf-wallet/chain-reader.mjs';
import { assertKrakenReadOnly, krakenReadOnlyBalances, krakenSignature } from '../lib/sf-wallet/exchange-reader.mjs';
import { createSfWalletService } from '../lib/sf-wallet/service.mjs';

const address = '0x' + '1'.repeat(40), other = '0x' + '2'.repeat(40);
const fixtureBlockTime = BigInt(Math.floor(Date.now() / 1000)) - 120n;
const finalHash = '0x' + 'a'.repeat(64), oldHash = '0x' + 'b'.repeat(64), transactionHash = '0x' + 'c'.repeat(64);
function reader(overrides = {}) {
  return async (method, params) => {
    if (Object.hasOwn(overrides, method)) return typeof overrides[method] === 'function' ? overrides[method](params) : overrides[method];
    if (method === 'eth_chainId') return '0x1';
    if (method === 'eth_getBalance') { assert.deepEqual(params[1], { blockHash: finalHash, requireCanonical: true }); return '0xde0b6b3a7640001'; }
    if (method === 'eth_getBlockByNumber') return { number: params[0] === '0x63' ? '0x63' : '0x64', hash: params[0] === '0x63' ? oldHash : finalHash, timestamp: `0x${fixtureBlockTime.toString(16)}` };
    if (method === 'eth_getTransactionByHash') return { hash: transactionHash, from: address, to: other, value: '0xde0b6b3a7640000', chainId: '0x1', blockNumber: '0x63', blockHash: oldHash };
    if (method === 'eth_getTransactionReceipt') return { transactionHash, from: address, to: other, status: '0x1', blockNumber: '0x63', blockHash: oldHash };
    throw Error('Unexpected method');
  };
}

test('wallet gates prohibit every fund-moving, custody and secret import action', () => {
  assert.ok(Object.values(WALLET_GATES).every(value => value === false));
});
test('vault references must name an external secrets system, never raw credential material', () => {
  assert.doesNotThrow(() => assertExternalVaultReference('vault:sf-wallet/owner/connection'));
  for (const value of ['plaintext-secret', 'https://evil.test/key', '0x' + 'a'.repeat(64), 'recovery phrase', '']) assert.throws(() => assertExternalVaultReference(value), /VAULT_REFERENCE_REQUIRED/);
});
test('address fields reject keys, recovery phrases, wrong lengths and zero addresses', async () => {
  assert.equal(addressFormat(address), address);
  for (const value of ['0x' + 'a'.repeat(64), 'recovery phrase words are not an address', '0x' + '0'.repeat(40), 'https://evil.test', address + '/']) assert.throws(() => addressFormat(value), /PUBLIC_ADDRESS_REQUIRED/);
  let options;
  assert.equal(await checkedAddress(address, { isAddress: (_, opts) => { options = opts; return true; } }), address);
  assert.equal(options.strict, true);
  await assert.rejects(checkedAddress(address, { isAddress: () => false }), /CHECKSUM_INVALID/);
});
test('QR payloads contain only a reviewed public address/network, never payment instructions', () => {
  assert.deepEqual(parsePublicAddressQr(publicAddressQr('base', address)), { chainKey: 'base', address });
  assert.deepEqual(parsePublicAddressQr(address, 'polygon'), { chainKey: 'polygon', address });
  for (const value of [`ethereum:${address}@1?value=1`, `ethereum:${address}@56`, `ethereum:${address}/transfer`, 'https://evil.test', 'seed words', 'xprv_not_a_public_address']) assert.throws(() => parsePublicAddressQr(value), /PUBLIC_ADDRESS_QR_ONLY/);
});
test('native amounts stay exact beyond JavaScript Number precision', () => {
  assert.equal(units('1000000000000000001'), '1.000000000000000001');
  assert.equal(units('9007199254740993000000000000000000'), '9007199254740993');
  assert.equal(units('0'), '0'); assert.throws(() => integerQuantity('0x00'), /INVALID_RPC_QUANTITY/);
  assert.throws(() => integerQuantity('0x' + 'f'.repeat(65)), /OUT_OF_RANGE/);
});
test('CSV quotes embedded delimiters/newlines and neutralizes formula injection', () => {
  assert.equal(csvCell('=RUN()'), '"\'=RUN()"');
  assert.equal(csvCell('name,"quoted"\nline'), '"name,""quoted""\nline"');
  for (const value of ['+cmd', '-cmd', '@cmd', '\tcmd', ' =cmd']) assert.equal(csvCell(value)[1], "'");
  assert.match(transactionCsv([{ label: '=cmd' }]), /"'=cmd"/);
});
test('RPC configuration requires HTTPS, host approval and two distinct providers', () => {
  const env = { SF_WALLET_ETHEREUM_RPC_PRIMARY_URL: 'https://one.example/rpc', SF_WALLET_ETHEREUM_RPC_SECONDARY_URL: 'https://two.example/rpc', SF_WALLET_RPC_ALLOWED_HOSTS: 'one.example,two.example' };
  assert.equal(configuredRpcUrls('ethereum', env).length, 2);
  for (const patch of [{ SF_WALLET_ETHEREUM_RPC_PRIMARY_URL: 'http://one.example' }, { SF_WALLET_ETHEREUM_RPC_PRIMARY_URL: 'https://user:secret@one.example' }, { SF_WALLET_RPC_ALLOWED_HOSTS: '' }]) assert.throws(() => configuredRpcUrls('ethereum', { ...env, ...patch }), /REJECTED/);
  assert.throws(() => configuredRpcUrls('ethereum', { ...env, SF_WALLET_ETHEREUM_RPC_SECONDARY_URL: 'https://one.example/other' }), /DISTINCT/);
});
test('RPC transport cannot sign, broadcast or call arbitrary methods', async () => {
  let calls = 0;
  const rpc = rpcReader('https://fixture.example', async (_, init) => { calls++; const input = JSON.parse(init.body); return Response.json({ id: input.id, jsonrpc: '2.0', result: '0x1' }); });
  for (const method of ['eth_sendRawTransaction', 'eth_sign', 'personal_unlockAccount', 'eth_call']) await assert.rejects(rpc(method), /WRITE_METHOD_DISABLED/);
  assert.equal(calls, 0); assert.equal(await rpc('eth_chainId'), '0x1');
});
test('RPC correlation and bounded responses reject malformed or oversized upstream data', async () => {
  const rpc = rpcReader('https://fixture.example', async () => Response.json({ id: 999, jsonrpc: '2.0', result: '0x1' }));
  await assert.rejects(rpc('eth_chainId'), /RESPONSE_REJECTED/);
  await assert.rejects(boundedJson(new Response('x'.repeat(11)), 10), /TOO_LARGE/);
});
test('balance corroboration anchors both sources to one finalized block hash', async () => {
  const snapshot = await createChainReader('ethereum', { readers: [reader(), reader()] }).balance(address);
  assert.equal(snapshot.rawBalance, '1000000000000000001'); assert.equal(snapshot.blockNumber, '100');
  assert.equal(snapshot.verification, 'TWO_RPC_FINALIZED_BLOCK');
});
test('wrong network, divergent balances and stale finalized blocks are never marked verified', async () => {
  await assert.rejects(createChainReader('ethereum', { readers: [reader(), reader({ eth_chainId: '0x89' })] }).balance(address), /CHAIN_ID_MISMATCH/);
  await assert.rejects(createChainReader('ethereum', { readers: [reader(), reader({ eth_getBalance: '0x2' })] }).balance(address), /DISAGREE/);
  await assert.rejects(createChainReader('ethereum', { readers: [reader(), reader({ eth_getBlockByNumber: { number: '0x64', hash: oldHash, timestamp: `0x${fixtureBlockTime.toString(16)}` } })] }).balance(address), /DISAGREE/);
  await assert.rejects(createChainReader('ethereum', { readers: [reader({ eth_getBlockByNumber: { number: '0x64', hash: finalHash, timestamp: '0x1' } }), reader({ eth_getBlockByNumber: { number: '0x64', hash: finalHash, timestamp: '0x1' } })] }).balance(address), /STALE/);
});
test('history corroborates receipts, actual address involvement and canonical finalized blocks', async () => {
  const item = await createChainReader('ethereum', { readers: [reader(), reader()] }).transaction(address, transactionHash, '100');
  assert.equal(item.rawValue, '1000000000000000000'); assert.equal(item.verification, 'TWO_RPC_FINALIZED_RECEIPT');
  await assert.rejects(createChainReader('ethereum', { readers: [reader(), reader({ eth_getTransactionReceipt: null })] }).transaction(address, transactionHash, '100'), /NOT_FINALIZED/);
  await assert.rejects(createChainReader('ethereum', { readers: [reader(), reader()] }).transaction('0x' + '3'.repeat(40), transactionHash, '100'), /ADDRESS_MISMATCH/);
});
test('failed native transactions record zero transferred value and a failed status', async () => {
  const receipt = { transactionHash, from: address, to: other, status: '0x0', blockNumber: '0x63', blockHash: oldHash };
  const item = await createChainReader('ethereum', { readers: [reader({ eth_getTransactionReceipt: receipt }), reader({ eth_getTransactionReceipt: receipt })] }).transaction(address, transactionHash, '100');
  assert.equal(item.rawValue, '0'); assert.equal(item.status, 'FAILED');
});
test('indexer candidates are bounded, deduplicated and never trusted as balance evidence', async () => {
  const result = await discoverTransactionHashes('ethereum', address, async () => Response.json({ items: [{ hash: transactionHash }, { hash: transactionHash }, { hash: 'invalid' }], next_page_params: { arbitrary: 'not-followed' } }));
  assert.deepEqual(result.hashes, [transactionHash]); assert.equal(result.hasMore, true);
});
test('Kraken permissions must be demonstrably read-only and include query-funds', () => {
  assert.doesNotThrow(() => assertKrakenReadOnly({ permissions: ['query-funds'] }));
  for (const permissions of [[], ['query-funds', 'withdraw-funds'], ['query-funds', 'modify-trades'], ['query-funds', 'unknown']]) assert.throws(() => assertKrakenReadOnly({ permissions }), /MUST_BE_READ_ONLY/);
  assert.throws(() => krakenSignature('/0/private/AddOrder', '1', 'nonce=1', 'fixture'), /WRITE_METHOD_DISABLED/);
});
test('exchange reads check actual permissions before Balance and never transmit the secret', async () => {
  const calls = [], credentials = { apiKey: 'F'.repeat(32), apiSecret: Buffer.alloc(64, 7).toString('base64') }; let nonce = 1n;
  const transport = async (url, init) => { calls.push({ url, ...init }); return Response.json({ error: [], result: url.endsWith('GetApiKeyInfo') ? { permissions: ['query-funds'] } : { XXBT: '1.00000000' } }); };
  const result = await krakenReadOnlyBalances({ credentials, nextNonce: () => String(nonce++), transport });
  assert.equal(result.balances.XXBT, '1.00000000'); assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(calls).includes(credentials.apiSecret), false);
  assert.equal(calls[0].redirect, 'error'); assert.ok(calls[0].headers['API-Sign']);
  assert.deepEqual(calls.map(call => new URLSearchParams(call.body).get('nonce')), ['1', '2']);
  let rejectedCalls = 0;
  await assert.rejects(krakenReadOnlyBalances({ credentials, nextNonce: () => '3', transport: async () => { rejectedCalls++; return Response.json({ error: [], result: { permissions: ['query-funds', 'withdraw-funds'] } }); } }), /MUST_BE_READ_ONLY/);
  assert.equal(rejectedCalls, 1);
});

function serviceFixture() {
  let state = { address: { id: 'w1', userId: 'u1', chainKey: 'ethereum', publicAddress: address, label: 'Watch only', archivedAt: null, createdAt: new Date() }, snapshots: [], transactions: [], audits: [], count: 1, reads: 0 };
  const db = {
    $queryRaw: async () => [],
    sfWalletAddress: {
      findFirst: async ({ where }) => state.address && where.id === state.address.id && where.userId === state.address.userId && !state.address.archivedAt ? state.address : null,
      findUnique: async ({ where }) => where.userId_chainKey_publicAddress.publicAddress === state.address.publicAddress ? state.address : null,
      count: async () => state.count,
      upsert: async ({ create, update }) => (state.address = state.address.publicAddress === create.publicAddress ? { ...state.address, ...update } : { id: 'w2', archivedAt: null, ...create }),
      update: async ({ data }) => Object.assign(state.address, data),
      findMany: async ({ where }) => where.userId === state.address.userId ? [{ ...state.address, snapshots: state.snapshots.slice(-1) }] : [],
    },
    sfWalletVault: { upsert: async ({ create }) => ({ ...create, status: 'METADATA_ONLY' }) },
    sfWalletSnapshot: { findFirst: async () => state.snapshots.at(-1) || null, upsert: async ({ create, update }) => { if (state.snapshots.length) Object.assign(state.snapshots[0], update); else state.snapshots.push(create); } },
    sfWalletTransaction: { findUnique: async ({ where }) => state.transactions.find(row => row.hash === where.addressId_hash.hash) || null, upsert: async ({ create }) => state.transactions.push(create), findMany: async () => state.transactions },
    sfExchangeConnection: { findMany: async ({ select }) => { assert.equal(select.secretReference, undefined); return []; } },
    auditEvent: { create: async ({ data }) => state.audits.push(data) },
    $transaction: async action => { const before = structuredClone(state); try { return await action(db); } catch (error) { state = before; throw error; } },
  };
  const chain = { balance: async () => { state.reads++; return { rawBalance: '1', symbol: 'ETH', decimals: 18, blockNumber: '100', blockHash: finalHash, verification: 'TWO_RPC_FINALIZED_BLOCK', observedAt: new Date() }; }, transaction: async () => ({ hash: transactionHash, blockHash: oldHash, blockNumber: '99', timestamp: new Date(), fromAddress: address, toAddress: other, rawValue: '1', status: 'SUCCESS', verification: 'TWO_RPC_FINALIZED_RECEIPT', observedAt: new Date() }) };
  return { db, chain, state: () => state, service: createSfWalletService({ db, validateAddress: async value => addressFormat(value).toLowerCase(), chainReader: () => chain, discover: async () => ({ hashes: [transactionHash], hasMore: false }) }) };
}
test('foreign account IDs cannot query history, export, QR or initiate blockchain reads', async () => {
  const f = serviceFixture();
  for (const action of ['history', 'exportCsv', 'qrPayload', 'refresh']) await assert.rejects(f.service[action]('u2', 'w1'), /NOT_FOUND/);
  assert.equal(f.state().reads, 0);
});
test('tracking rejects secret fields, enforces the address cap, and audits metadata only', async () => {
  const f = serviceFixture();
  await assert.rejects(f.service.track('u1', { chainKey: 'ethereum', publicAddress: address, label: 'Watch', privateKey: 'never accepted' }), /UNSUPPORTED/);
  f.state().count = 50;
  await assert.rejects(f.service.track('u1', { chainKey: 'ethereum', publicAddress: other, label: 'New' }), /LIMIT_REACHED/);
  await f.service.track('u1', { chainKey: 'ethereum', publicAddress: address, label: 'Updated label' });
  assert.equal(f.state().audits[0].metadata.chainKey, 'ethereum');
  assert.equal(JSON.stringify(f.state().audits).includes(address), false);
});
test('corroborated snapshots/history and their audit are stored together', async () => {
  const f = serviceFixture(); const result = await f.service.refresh('u1', 'w1');
  assert.equal(result.verifiedTransactions, 1); assert.equal(f.state().snapshots.length, 1);
  assert.equal(f.state().transactions.length, 1); assert.equal(f.state().audits.at(-1).action, 'sf-wallet.address.refreshed');
});
test('stale/conflicting balance reads and audit failure cannot replace a verified snapshot', async () => {
  const f = serviceFixture(); await f.service.refresh('u1', 'w1');
  f.state().snapshots[0].blockNumber = '101';
  await assert.rejects(f.service.refresh('u1', 'w1'), /STALE_CHAIN_SNAPSHOT/);
  f.state().snapshots[0].blockNumber = '100'; f.state().snapshots[0].rawBalance = '2';
  await assert.rejects(f.service.refresh('u1', 'w1'), /BALANCE_CONFLICT/);
  f.state().snapshots = []; f.state().transactions = [];
  f.db.auditEvent.create = async () => { throw Error('fixture-audit-outage'); };
  await assert.rejects(f.service.refresh('u1', 'w1'), /fixture-audit-outage/);
  assert.equal(f.state().snapshots.length, 0);
});
test('archive is metadata-only, and missing credential vaults fail closed', async () => {
  const f = serviceFixture(); await f.service.archive('u1', 'w1');
  assert.ok(f.state().address.archivedAt); assert.equal(f.state().reads, 0);
  await assert.rejects(f.service.refreshExchange('u1', 'connection'), /VAULT_NOT_CONFIGURED/);
});
test('portfolio and exports never fabricate a balance or accept an indexer as verification', async () => {
  const f = serviceFixture(); const result = await f.service.portfolio('u1');
  assert.equal(result.addresses[0].snapshots.length, 0); assert.equal(result.valuation, 'NOT_CONNECTED');
  assert.equal(result.vault.custodyEnabled, false);
  await f.service.refresh('u1', 'w1');
  const csv = await f.service.exportCsv('u1', 'w1');
  assert.ok(csv.includes('TWO_RPC_FINALIZED_RECEIPT')); assert.equal(f.state().audits.at(-1).action, 'sf-wallet.history.exported');
});
