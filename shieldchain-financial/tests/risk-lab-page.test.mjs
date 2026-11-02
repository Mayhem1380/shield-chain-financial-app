import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const page = readFileSync(new URL('../app/risk-lab/page.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('risk lab is clearly presented as an educational simulation', () => {
  assert.match(page, /SIMULATION ONLY/);
  assert.match(page, /No live prices, trade execution or recommendations/);
  assert.match(page, /not a forecast/i);
  assert.match(page, /does not suggest that any asset is suitable/i);
});

test('risk lab exposes adjustable amount, decline and fee assumptions', () => {
  for (const label of ['Hypothetical amount in Australian dollars', 'Hypothetical market decline percentage', 'Example fee rate percentage']) assert.ok(page.includes(label));
  for (const result of ['Estimated amount remaining', 'Market decline impact', 'Example fee', 'Total estimated impact']) assert.ok(page.includes(result));
  assert.match(page, /setAmount\(1000\);setDrop\(20\);setFee\(0\.5\)/);
});

test('risk lab links to other educational and transparency pages', () => {
  for (const path of ['/handbook', '/transparency', '/status']) assert.ok(page.includes(path));
  assert.equal(existsSync(new URL('../app/globals.css', import.meta.url)), true);
});
