import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const pkg = readJson('package.json');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (id, status, detail) => checks.push({ id, status, detail });

const nodeMajor = Number(process.versions.node.split('.')[0]);
add('node-version', nodeMajor >= 20 ? 'pass' : 'block', `Node ${process.versions.node}; Next.js 15 project requires a supported modern Node runtime.`);
add('package-lock', exists('package-lock.json') ? 'pass' : 'block', exists('package-lock.json') ? 'package-lock.json exists.' : 'No package-lock.json; reproducible npm ci is not available yet.');
add('dependencies-installed', exists('node_modules') ? 'pass' : 'block', exists('node_modules') ? 'node_modules directory exists; package integrity still needs verification.' : 'node_modules is absent; application build/typecheck cannot run yet.');
add('env-example', exists('.env.example') ? 'pass' : 'block', exists('.env.example') ? '.env.example exists; verify it contains placeholders only.' : '.env.example is missing.');
for (const script of ['build', 'typecheck', 'lint', 'db:generate', 'db:preflight', 'security:preflight', 'test:policy', 'test:integration-security']) {
  add(`script:${script}`, typeof pkg.scripts?.[script] === 'string' ? 'pass' : 'block', typeof pkg.scripts?.[script] === 'string' ? `npm script ${script} is defined.` : `Required npm script ${script} is missing.`);
}
if (exists('.env')) add('local-env-file', 'review', '.env exists. Confirm it is never committed and all credentials are development-only or appropriately managed.');
else add('local-env-file', 'pass', 'No local .env file detected in this workspace.');

const blockers = checks.filter((c) => c.status === 'block');
const review = checks.filter((c) => c.status === 'review');
const report = {
  project: pkg.name,
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'blocked' : review.length ? 'review-required' : 'ready-for-validation',
  summary: { passed: checks.filter((c) => c.status === 'pass').length, blockers: blockers.length, review: review.length },
  checks,
  limitations: [
    'This is an environment and script-presence report, not a successful Next.js build.',
    'It does not verify dependency provenance, provider integrations, database connectivity, authentication, or production security.',
    'Live financial capabilities must remain disabled until their independent release gates are approved.'
  ]
};
console.log(JSON.stringify(report, null, 2));
// The report command is diagnostic by design. Consumers decide whether to block deployment from status.
