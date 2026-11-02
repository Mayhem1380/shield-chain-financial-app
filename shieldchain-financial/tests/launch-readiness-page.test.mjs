import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const page = readFileSync(new URL('../app/launch-readiness/page.tsx', import.meta.url), 'utf8');
const docsPath = new URL('../docs/LAUNCH-READINESS-CONTROL-BOARD.md', import.meta.url);

test('launch board communicates pre-launch status and dependency blocker', () => {
  assert.match(page, /NOT PRODUCTION READY/);
  assert.match(page, /no verified lockfile/i);
  assert.match(page, /full framework build has not yet been run/i);
});

test('all six release gates are represented', () => {
  for (const label of ['Reproducible dependencies', 'Build and static quality', 'Identity and access', 'Financial providers', 'Security and recovery', 'Legal and customer readiness']) {
    assert.ok(page.includes(label), `Missing gate: ${label}`);
  }
});

test('real financial capabilities remain gated pending approval', () => {
  assert.match(page, /No customer funds, real orders, custody, withdrawals, payments or payouts before required approvals/);
  assert.match(page, /not a live deployment monitor or certification/i);
});

test('launch control board documentation exists', () => {
  assert.equal(existsSync(docsPath), true);
  const docs = readFileSync(docsPath, 'utf8');
  assert.match(docs, /Evidence rule/);
  assert.match(docs, /Non-negotiable safety gate/);
});
