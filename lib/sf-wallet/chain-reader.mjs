import { SfWalletError, chainByKey, addressFormat, integerQuantity } from './policy.mjs';

const rpcMethods = new Set(['eth_chainId', 'eth_getBlockByNumber', 'eth_getBalance', 'eth_getTransactionByHash', 'eth_getTransactionReceipt']);
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
export async function boundedJson(response, maximum = 2097152) {
  if (!response.ok) throw new SfWalletError('READ_PROVIDER_UNAVAILABLE', 502);
  const reader = response.body?.getReader();
  if (!reader) throw new SfWalletError('READ_PROVIDER_INVALID_RESPONSE', 502);
  const chunks = []; let length = 0;
  while (true) {
    const item = await reader.read(); if (item.done) break;
    length += item.value.byteLength;
    if (length > maximum) { await reader.cancel(); throw new SfWalletError('READ_PROVIDER_RESPONSE_TOO_LARGE', 502); }
    chunks.push(Buffer.from(item.value));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new SfWalletError('READ_PROVIDER_INVALID_RESPONSE', 502); }
}
export function configuredRpcUrls(chainKey, env = process.env) {
  chainByKey(chainKey);
  const prefix = `SF_WALLET_${chainKey.toUpperCase()}`;
  const values = [env[`${prefix}_RPC_PRIMARY_URL`], env[`${prefix}_RPC_SECONDARY_URL`]];
  const allowed = new Set((env.SF_WALLET_RPC_ALLOWED_HOSTS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
  let urls;
  try { urls = values.map(value => new URL(value)); } catch { throw new SfWalletError('CHAIN_READ_PROVIDERS_NOT_CONFIGURED', 503); }
  for (const url of urls) {
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || !allowed.has(url.hostname) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname)) throw new SfWalletError('CHAIN_PROVIDER_CONFIGURATION_REJECTED', 503);
  }
  if (urls[0].hostname === urls[1].hostname) throw new SfWalletError('TWO_DISTINCT_RPC_PROVIDERS_REQUIRED', 503);
  return urls.map(url => url.href);
}
export function rpcReader(url, transport = fetch, sharedSignal) {
  let id = 0;
  return async (method, params = []) => {
    if (!rpcMethods.has(method)) throw new SfWalletError('WALLET_WRITE_METHOD_DISABLED', 403);
    const requestId = ++id;
    let data;
    try {
      data = await boundedJson(await transport(url, { method: 'POST', redirect: 'error', signal: sharedSignal ? AbortSignal.any([sharedSignal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) }), 262144);
    } catch (error) { if (error instanceof SfWalletError) throw error; throw new SfWalletError('CHAIN_READ_UNAVAILABLE', 502); }
    if (data.jsonrpc !== '2.0' || data.id !== requestId || data.error || !Object.hasOwn(data, 'result')) throw new SfWalletError('CHAIN_RPC_RESPONSE_REJECTED', 502);
    return data.result;
  };
}
function header(block) {
  if (!block || !hashPattern.test(block.hash || '')) throw new SfWalletError('CANONICAL_BLOCK_REQUIRED', 502);
  const number = integerQuantity(block.number, 64), timestamp = integerQuantity(block.timestamp, 64);
  if (timestamp > BigInt(Math.floor(Date.now() / 1000) + 120)) throw new SfWalletError('BLOCK_TIMESTAMP_REJECTED', 502);
  return { number, hash: block.hash.toLowerCase(), timestamp: new Date(Number(timestamp) * 1000) };
}
function sameHeader(a, b) {
  if (a.number !== b.number || a.hash !== b.hash || a.timestamp.getTime() !== b.timestamp.getTime()) throw new SfWalletError('CHAIN_PROVIDERS_DISAGREE', 502);
}

export function createChainReader(chainKey, { env = process.env, transport = fetch, readers, signal } = {}) {
  const chain = chainByKey(chainKey);
  const clients = readers || configuredRpcUrls(chainKey, env).map(url => rpcReader(url, transport, signal));
  if (clients.length !== 2) throw new SfWalletError('TWO_DISTINCT_RPC_PROVIDERS_REQUIRED', 503);
  let checked = false;
  async function verifyChain() {
    if (checked) return;
    const ids = await Promise.all(clients.map(client => client('eth_chainId')));
    if (ids.some(value => integerQuantity(value, 64) !== BigInt(chain.id))) throw new SfWalletError('RPC_CHAIN_ID_MISMATCH', 502);
    checked = true;
  }
  return {
    async balance(address) {
      addressFormat(address); await verifyChain();
      const first = header(await clients[0]('eth_getBlockByNumber', ['finalized', false]));
      const second = header(await clients[1]('eth_getBlockByNumber', [`0x${first.number.toString(16)}`, false]));
      sameHeader(first, second);
      if (Date.now() - first.timestamp.getTime() > 2 * 3600000) throw new SfWalletError('FINALIZED_NODE_DATA_STALE', 502);
      const results = await Promise.all(clients.map(client => client('eth_getBalance', [address, { blockHash: first.hash, requireCanonical: true }])));
      const quantities = results.map(value => integerQuantity(value));
      if (quantities[0] !== quantities[1]) throw new SfWalletError('CHAIN_PROVIDERS_DISAGREE', 502);
      return { rawBalance: quantities[0].toString(), symbol: chain.symbol, decimals: chain.decimals, blockNumber: first.number.toString(), blockHash: first.hash, verification: 'TWO_RPC_FINALIZED_BLOCK', observedAt: new Date() };
    },
    async transaction(address, hash, finalizedBlockNumber) {
      addressFormat(address);
      if (!hashPattern.test(hash || '')) throw new SfWalletError('INVALID_TRANSACTION_HASH');
      await verifyChain();
      const results = await Promise.all(clients.map(async client => ({ tx: await client('eth_getTransactionByHash', [hash]), receipt: await client('eth_getTransactionReceipt', [hash]) })));
      const normalized = results.map(({ tx, receipt }) => {
        if (!tx || !receipt || tx.hash?.toLowerCase() !== hash.toLowerCase() || receipt.transactionHash?.toLowerCase() !== hash.toLowerCase() || !hashPattern.test(receipt.blockHash || '') || !['0x0', '0x1'].includes(receipt.status)) throw new SfWalletError('TRANSACTION_NOT_FINALIZED', 502);
        const from = addressFormat(tx.from).toLowerCase(), to = tx.to === null ? null : addressFormat(tx.to).toLowerCase();
        if (from !== address.toLowerCase() && to !== address.toLowerCase() || receipt.from?.toLowerCase() !== from || (receipt.to?.toLowerCase() || null) !== to) throw new SfWalletError('TRANSACTION_ADDRESS_MISMATCH', 502);
        const blockNumber = integerQuantity(receipt.blockNumber, 64);
        if (blockNumber > BigInt(finalizedBlockNumber) || tx.blockHash?.toLowerCase() !== receipt.blockHash.toLowerCase() || integerQuantity(tx.blockNumber, 64) !== blockNumber || tx.chainId && integerQuantity(tx.chainId, 64) !== BigInt(chain.id)) throw new SfWalletError('TRANSACTION_NOT_FINALIZED', 502);
        return { hash: hash.toLowerCase(), blockHash: receipt.blockHash.toLowerCase(), blockNumber: blockNumber.toString(), fromAddress: from, toAddress: to, rawValue: receipt.status === '0x1' ? integerQuantity(tx.value).toString() : '0', status: receipt.status === '0x1' ? 'SUCCESS' : 'FAILED' };
      });
      if (JSON.stringify(normalized[0]) !== JSON.stringify(normalized[1])) throw new SfWalletError('TRANSACTION_PROVIDERS_DISAGREE', 502);
      const blocks = await Promise.all(clients.map(client => client('eth_getBlockByNumber', [`0x${BigInt(normalized[0].blockNumber).toString(16)}`, false]).then(header)));
      sameHeader(blocks[0], blocks[1]);
      if (blocks[0].hash !== normalized[0].blockHash) throw new SfWalletError('TRANSACTION_CANONICAL_BLOCK_MISMATCH', 502);
      return { ...normalized[0], timestamp: blocks[0].timestamp, verification: 'TWO_RPC_FINALIZED_RECEIPT', observedAt: new Date() };
    },
  };
}

export async function discoverTransactionHashes(chainKey, address, transport = fetch, signal) {
  const chain = chainByKey(chainKey); addressFormat(address);
  let data;
  try { data = await boundedJson(await transport(`${chain.explorer}/api/v2/addresses/${address}/transactions`, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000), headers: { Accept: 'application/json' } })); }
  catch { throw new SfWalletError('HISTORY_INDEXER_UNAVAILABLE', 502); }
  if (!Array.isArray(data.items)) throw new SfWalletError('HISTORY_INDEXER_INVALID_RESPONSE', 502);
  return { hashes: [...new Set(data.items.map(item => item.hash).filter(hash => hashPattern.test(hash || '')))].slice(0, 10), hasMore: Boolean(data.next_page_params) || data.items.length > 10 };
}
