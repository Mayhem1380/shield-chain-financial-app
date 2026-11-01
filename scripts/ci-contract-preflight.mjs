import fs from 'node:fs';
import process from 'node:process';

const failures = [];
const workflowPath = '.github/workflows/quality-gates.yml';
const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, 'utf8') : '';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!workflow) failures.push('Quality-gates workflow is missing.');
for (const token of ['npm ci --no-audit --no-fund', 'npm run test:policy', 'npm run preflight', 'npm run db:preflight', 'npm run security:preflight', 'npm run typecheck', 'npm run lint', 'npm run db:generate', 'npm run build']) {
  if (!workflow.includes(token)) failures.push(`CI workflow is missing required command: ${token}`);
}
if (pkg.scripts?.['ci:contract'] !== 'node scripts/ci-contract-preflight.mjs') failures.push('ci:contract script is not registered.');
if (!fs.existsSync('docs/REPRODUCIBLE-BUILD-AND-CI.md')) failures.push('Reproducible-build contract documentation is missing.');
if (fs.existsSync('package-lock.json')) {
  try {
    const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    if (lock.name !== pkg.name) failures.push('Lockfile project name does not match package.json.');
    if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 2) failures.push('Lockfile version must be npm lockfile v2 or newer.');
  } catch { failures.push('package-lock.json is not valid JSON.'); }
}
if (failures.length) {
  console.error('CI contract preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('CI contract preflight passed.');
  if (!fs.existsSync('package-lock.json')) console.log('BLOCKER: package-lock.json is absent; npm ci will not proceed until a reviewed lockfile is committed.');
}
