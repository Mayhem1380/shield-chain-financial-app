import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { checkedAddress, publicAddressQr, parsePublicAddressQr } from '../lib/sf-wallet/policy.mjs';

const ready = ['viem', 'qrcode', 'jsqr'].every(name => existsSync(new URL(`../node_modules/${name}/package.json`, import.meta.url)));
const skip = !ready && process.env.SHIELDCHAIN_REQUIRE_WALLET_DEPENDENCIES !== '1';
test('installed viem validates real EIP-55 checksums', { skip }, async () => {
  assert.equal(ready, true, 'Install wallet dependencies before claiming checksum verification passed');
  const valid = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
  assert.equal(await checkedAddress(valid), valid.toLowerCase());
  await assert.rejects(checkedAddress('0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), /CHECKSUM_INVALID/);
});
test('installed QR encoder and decoder round-trip an address-only network payload', { skip }, async () => {
  assert.equal(ready, true, 'Install wallet dependencies before claiming QR round-trip passed');
  const qr = (await import('qrcode')).default, decode = (await import('jsqr')).default;
  const address = '0x' + '1'.repeat(40), payload = publicAddressQr('base', address);
  const matrix = qr.create(payload, { errorCorrectionLevel: 'M' }).modules;
  const scale = 4, margin = 4, width = (matrix.size + 2 * margin) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const row = Math.floor(y / scale) - margin, column = Math.floor(x / scale) - margin;
    const dark = row >= 0 && row < matrix.size && column >= 0 && column < matrix.size && matrix.get(row, column);
    const offset = (y * width + x) * 4; pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = dark ? 0 : 255; pixels[offset + 3] = 255;
  }
  const result = decode(pixels, width, width);
  assert.equal(result?.data, payload);
  assert.deepEqual(parsePublicAddressQr(result.data), { chainKey: 'base', address });
});
