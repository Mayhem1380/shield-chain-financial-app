import { createHash, createHmac } from 'node:crypto';
import { boundedJson } from './chain-reader.mjs';
import { SfWalletError } from './policy.mjs';

export function krakenSignature(path, nonce, body, secret) {
  if (!['/0/private/GetApiKeyInfo', '/0/private/Balance'].includes(path)) throw new SfWalletError('EXCHANGE_WRITE_METHOD_DISABLED', 403);
  return createHmac('sha512', Buffer.from(secret, 'base64')).update(Buffer.concat([Buffer.from(path), createHash('sha256').update(nonce + body).digest()])).digest('base64');
}
export function assertKrakenReadOnly(info) {
  const allowed = new Set(['query-funds', 'query-open-trades', 'query-closed-trades', 'query-ledger-entries']);
  if (!Array.isArray(info?.permissions) || !info.permissions.includes('query-funds') || info.permissions.some(permission => !allowed.has(permission))) throw new SfWalletError('EXCHANGE_KEY_MUST_BE_READ_ONLY', 403);
}

// Secrets are supplied only by an approved server-side external vault resolver.
// This module never accepts a wallet key/seed, stores API secrets or guesses credentials.
export async function krakenReadOnlyBalances({ credentials, nextNonce, transport = fetch }) {
  if (typeof credentials?.apiKey !== 'string' || !/^[A-Za-z0-9+/=]{16,256}$/.test(credentials.apiKey) || typeof credentials?.apiSecret !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(credentials.apiSecret) || typeof nextNonce !== 'function') throw new SfWalletError('EXCHANGE_VAULT_CREDENTIALS_UNAVAILABLE', 503);
  const secretBytes = Buffer.from(credentials.apiSecret, 'base64');
  if (secretBytes.length < 32 || secretBytes.length > 128) throw new SfWalletError('EXCHANGE_VAULT_CREDENTIALS_UNAVAILABLE', 503);
  async function call(path) {
    const nonce = String(await nextNonce());
    if (!/^[0-9]{1,20}$/.test(nonce) || BigInt(nonce) >= 1n << 64n) throw new SfWalletError('EXCHANGE_NONCE_INVALID', 503);
    const body = new URLSearchParams({ nonce }).toString();
    let data;
    try {
      data = await boundedJson(await transport(`https://api.kraken.com${path}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'API-Key': credentials.apiKey, 'API-Sign': krakenSignature(path, nonce, body, credentials.apiSecret), 'Content-Type': 'application/x-www-form-urlencoded' }, body }));
    } catch { throw new SfWalletError('EXCHANGE_READ_UNAVAILABLE', 502); }
    if (!Array.isArray(data.error) || data.error.length || !data.result || typeof data.result !== 'object') throw new SfWalletError('EXCHANGE_READ_UNAVAILABLE', 502);
    return data.result;
  }
  const info = await call('/0/private/GetApiKeyInfo');
  assertKrakenReadOnly(info);
  const balance = await call('/0/private/Balance');
  const entries = Object.entries(balance);
  if (entries.length > 1000 || entries.some(([asset, amount]) => !/^[A-Z0-9_.]{1,24}$/.test(asset) || typeof amount !== 'string' || !/^[0-9]{1,78}(?:\.[0-9]{1,36})?$/.test(amount))) throw new SfWalletError('EXCHANGE_BALANCE_RESPONSE_REJECTED', 502);
  return { balances: Object.fromEntries(entries), scopeCheckedAt: new Date(), observedAt: new Date(), verification: 'EXCHANGE_REPORTED_READ_ONLY' };
}
