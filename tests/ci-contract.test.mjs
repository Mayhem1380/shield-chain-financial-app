import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/quality-gates.yml', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const docs = readFileSync(new URL('../docs/REPRODUCIBLE-BUILD-AND-CI.md', import.meta.url), 'utf8');

test('CI uses a lockfile-enforcing clean install', () => {
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.doesNotMatch(workflow, /run: npm install --no-audit --no-fund/);
});

test('CI runs policy, preflight, schema, security and application quality gates', () => {
  for (const command of ['npm run test:policy', 'npm run preflight', 'npm run db:preflight', 'npm run security:preflight', 'npm run typecheck', 'npm run lint', 'npm run db:generate', 'npm run build']) assert.ok(workflow.includes(command), `Missing ${command}`);
});

test('CI contract preflight is registered and its lockfile blocker is documented honestly', () => {
  assert.equal(packageJson.scripts['ci:contract'], 'node scripts/ci-contract-preflight.mjs');
  assert.ok(existsSync(new URL('../scripts/ci-contract-preflight.mjs', import.meta.url)));
  assert.match(docs, /does not contain a reviewed npm lockfile/i);
  assert.match(docs, /No successful Next\.js production build is claimed/i);
});
