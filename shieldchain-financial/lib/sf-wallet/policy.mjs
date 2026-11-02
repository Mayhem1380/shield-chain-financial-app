export class SfWalletError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const WALLET_GATES = Object.freeze({ privateKeyImport: false, recoveryPhraseImport: false, signing: false, transfers: false, withdrawals: false, custody: false, sweeping: false });
export const CHAINS = Object.freeze({
  ethereum: { key: 'ethereum', name: 'Ethereum', id: 1, symbol: 'ETH', decimals: 18, explorer: 'https://eth.blockscout.com' },
  base: { key: 'base', name: 'Base', id: 8453, symbol: 'ETH', decimals: 18, explorer: 'https://base.blockscout.com' },
  polygon: { key: 'polygon', name: 'Polygon', id: 137, symbol: 'POL', decimals: 18, explorer: 'https://polygon.blockscout.com' },
});
export function chainByKey(key) {
  if (!Object.hasOwn(CHAINS, key || '')) throw new SfWalletError('CHAIN_NOT_SUPPORTED');
  return CHAINS[key];
}
export function assertWalletFields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) throw new SfWalletError('UNSUPPORTED_WALLET_INPUT');
}
export function assertExternalVaultReference(reference) {
  if (typeof reference !== 'string' || !/^(?:vault|aws-secretsmanager|gcp-secretmanager|azure-keyvault):[A-Za-z0-9/._:-]{2,280}$/.test(reference)) throw new SfWalletError('EXTERNAL_VAULT_REFERENCE_REQUIRED', 503);
}
export function addressFormat(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value) || /^0x0{40}$/.test(value)) throw new SfWalletError('PUBLIC_ADDRESS_REQUIRED');
  return value;
}
export async function checkedAddress(value, validator) {
  addressFormat(value);
  let api = validator;
  if (!api) { try { api = await import('viem'); } catch { throw new SfWalletError('ADDRESS_VALIDATOR_NOT_INSTALLED', 503); } }
  if (!api.isAddress(value, { strict: true })) throw new SfWalletError('PUBLIC_ADDRESS_CHECKSUM_INVALID');
  return value.toLowerCase();
}
export function parsePublicAddressQr(value, selectedChain = 'ethereum') {
  if (typeof value !== 'string' || value.length > 160) throw new SfWalletError('PUBLIC_ADDRESS_QR_ONLY');
  const text = value.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(text)) return { chainKey: chainByKey(selectedChain).key, address: addressFormat(text) };
  const match = /^ethereum:(0x[0-9a-fA-F]{40})@([0-9]{1,10})$/.exec(text);
  const chain = match && Object.values(CHAINS).find(item => item.id === Number(match[2]));
  if (!chain) throw new SfWalletError('PUBLIC_ADDRESS_QR_ONLY');
  return { chainKey: chain.key, address: addressFormat(match[1]) };
}
export function publicAddressQr(chainKey, address) {
  return `ethereum:${addressFormat(address)}@${chainByKey(chainKey).id}`;
}
export function integerQuantity(value, bits = 256) {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value)) throw new SfWalletError('INVALID_RPC_QUANTITY', 502);
  const number = BigInt(value);
  if (number >= 1n << BigInt(bits)) throw new SfWalletError('RPC_QUANTITY_OUT_OF_RANGE', 502);
  return number;
}
export function units(raw, decimals = 18) {
  if (typeof raw !== 'string' || !/^[0-9]{1,78}$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new SfWalletError('INVALID_BALANCE');
  const n = BigInt(raw), scale = 10n ** BigInt(decimals);
  if (!decimals) return n.toString();
  const fraction = (n % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${n / scale}${fraction ? `.${fraction}` : ''}`;
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function transactionCsv(rows) {
  const fields = ['chainKey', 'publicAddress', 'label', 'hash', 'blockNumber', 'timestamp', 'fromAddress', 'toAddress', 'nativeAmount', 'status', 'verification'];
  return '\ufeff' + [fields.map(csvCell).join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\r\n') + '\r\n';
}
