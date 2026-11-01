import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const page = readFileSync(new URL('../app/status/page.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const transparency = readFileSync(new URL('../app/transparency/page.tsx', import.meta.url), 'utf8');

test('status centre explicitly discloses that it is not a live monitor', () => {
  assert.match(page, /static project preview—not a live uptime monitor/i);
  assert.match(page, /Live monitoring and alert integrations are not configured/i);
});

test('service catalogue keeps real financial systems visibly disabled or unconnected', () => {
  for (const item of ['Account sign-in & identity checks', 'Market prices & exchange quotes', 'Deposits, custody & withdrawals', 'Payments, rewards & challenge payouts']) assert.ok(page.includes(item));
  assert.match(page, /No customer funds or wallet movements can be processed/i);
  assert.match(page, /No payment rail or payout provider is connected/i);
});

test('incident communication guidance includes impact, customer actions and next update', () => {
  for (const term of ['Impact:', 'Customer guidance:', 'Next update:', 'confirmed details separated from investigation']) assert.ok(page.includes(term));
});

test('status centre is discoverable from primary navigation', () => {
  assert.match(home, /href="\/status">Service status/);
  assert.match(transparency, /href="\/status">Service status/);
  assert.equal(existsSync(new URL('../docs/SERVICE-STATUS-AND-INCIDENT-COMMUNICATION.md', import.meta.url)), true);
});
