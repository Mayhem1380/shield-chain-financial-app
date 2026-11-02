import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'app/page.tsx',
  'app/risk-lab/page.tsx',
  'tests/risk-lab-page.test.mjs',
  'docs/REPRODUCIBLE-BUILD-AND-CI.md',
  'scripts/ci-contract-preflight.mjs',
  'tests/ci-contract.test.mjs',
  'app/transparency/page.tsx',
  'app/launch-readiness/page.tsx',
  'app/status/page.tsx',
  'tests/status-page.test.mjs',
  'docs/SERVICE-STATUS-AND-INCIDENT-COMMUNICATION.md',
  'docs/LAUNCH-READINESS-CONTROL-BOARD.md',
  'tests/launch-readiness-page.test.mjs',
  'docs/TRANSPARENCY-CENTRE.md',
  'tests/transparency-page.test.mjs',
  'app/account/page.tsx',
  'app/api/health/route.ts',
  'app/robots.ts',
  'prisma/schema.prisma',
  'docs/SECURITY-CHECKLIST.md',
  'docs/PRIVATE-BETA-PLAN.md',
  'docs/IDENTITY-AND-WITHDRAWAL-CONTROL-PLAN.md',
  'docs/AI-CRAWLER-AND-PLATFORM-PROTECTION.md',
  'docs/RELEASE-READINESS-AND-THREAT-MODEL.md',
  'docs/AUTHENTICATION-AND-AUTHORIZATION-IMPLEMENTATION-PLAN.md',
  'docs/DATABASE-AND-MIGRATION-READINESS.md',
  'scripts/schema-preflight.mjs',
  'scripts/security-regression-preflight.mjs',
  'lib/withdrawal-policy.mjs',
  'lib/access-policy.mjs',
  'lib/server-authorization-boundary.mjs',
  'lib/verified-session-contract.mjs',
  'lib/auth-flow-policy.mjs',
  'tests/auth-flow-policy.test.mjs',
  'docs/AUTHENTICATION-FLOW-POLICY.md',
  'tests/verified-session-contract.test.mjs',
  'docs/VERIFIED-SESSION-CONTRACT.md',
  'tests/server-authorization-boundary.test.mjs',
  'docs/SERVER-AUTHORIZATION-BOUNDARY.md',
  'tests/access-policy.test.mjs',
  'docs/AUTHORIZATION-POLICY-FOUNDATION.md',
  'tests/withdrawal-policy.test.mjs',
  'docs/SECURITY-REGRESSION-TEST-PLAN.md',
  'docs/WITHDRAWAL-POLICY-FOUNDATION.md',
  'lib/data-retention-policy.mjs',
  'tests/data-retention-policy.test.mjs',
  'docs/DATA-RETENTION-AND-PRIVACY-MATRIX.md',
  'docs/INCIDENT-RESPONSE-PLAYBOOK.md',
  'docs/PRODUCTION-INTEGRATION-GATE.md',
  'lib/security-event-policy.mjs',
  'tests/security-event-policy.test.mjs',
  'docs/SECURITY-EVENT-LOGGING-FOUNDATION.md',
  'lib/support-ticket-policy.mjs',
  'tests/support-ticket-policy.test.mjs',
  'docs/SUPPORT-TICKET-WORKFLOW-POLICY.md',
  'lib/provider-webhook-policy.mjs',
  'tests/provider-webhook-policy.test.mjs',
  'docs/PROVIDER-WEBHOOK-INTEGRATION-CONTRACT.md',
  'lib/release-gate-policy.mjs',
  'tests/release-gate-policy.test.mjs',
  'docs/RELEASE-GATES-AND-CAPABILITY-FLAGS.md',
  'lib/financial-operation-policy.mjs',
  'tests/financial-operation-policy.test.mjs',
  'docs/FINANCIAL-OPERATION-ADMISSION.md',
  'lib/backup-recovery-policy.mjs',
  'tests/backup-recovery-policy.test.mjs',
  'docs/BACKUP-AND-DISASTER-RECOVERY-GATES.md',
  'lib/rate-limit-policy.mjs',
  'tests/rate-limit-policy.test.mjs',
  'docs/RATE-LIMITING-AND-ABUSE-RESILIENCE.md',
  'lib/request-integrity-policy.mjs',
  'tests/request-integrity-policy.test.mjs',
  'docs/REQUEST-INTEGRITY-AND-CSRF-FOUNDATION.md',
  'docs/SECURITY-HEADERS-AND-CACHE-CONTROLS.md',
  'tests/integration-security-flow.test.mjs',
  'docs/SECURITY-POLICY-INTEGRATION-TESTS.md',
  'scripts/preflight.mjs',
  'scripts/build-readiness-report.mjs',
  'docs/BUILD-READINESS-REPORT.md',
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`Missing required project file: ${file}`);
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (packageJson.scripts?.build !== 'next build') failures.push('Build script must remain `next build`.');
if (packageJson.scripts?.preflight !== 'node scripts/preflight.mjs') failures.push('Preflight script is not registered in package.json.');
if (packageJson.scripts?.['build:readiness'] !== 'node scripts/build-readiness-report.mjs') failures.push('Build-readiness report is not registered in package.json.');
if (packageJson.scripts?.['test:launch-readiness'] !== 'node --test tests/launch-readiness-page.test.mjs') failures.push('Launch-readiness page test script is not registered in package.json.');
if (packageJson.scripts?.['test:transparency'] !== 'node --test tests/transparency-page.test.mjs') failures.push('Transparency-page test script is not registered in package.json.');
if (packageJson.scripts?.['ci:contract'] !== 'node scripts/ci-contract-preflight.mjs') failures.push('CI contract preflight script is not registered in package.json.');
if (packageJson.scripts?.['test:ci-contract'] !== 'node --test tests/ci-contract.test.mjs') failures.push('CI contract test script is not registered in package.json.');
if (packageJson.scripts?.['test:risk-lab'] !== 'node --test tests/risk-lab-page.test.mjs') failures.push('Risk-lab page test script is not registered in package.json.');
if (packageJson.scripts?.['test:status-page'] !== 'node --test tests/status-page.test.mjs') failures.push('Service-status page test script is not registered in package.json.');
if (packageJson.scripts?.['db:preflight'] !== 'node scripts/schema-preflight.mjs') failures.push('Database schema preflight script is not registered in package.json.');
if (packageJson.scripts?.['security:preflight'] !== 'node scripts/security-regression-preflight.mjs') failures.push('Security regression preflight script is not registered in package.json.');
if (packageJson.scripts?.['test:retention-policy'] !== 'node --test tests/data-retention-policy.test.mjs') failures.push('Retention policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:security-events'] !== 'node --test tests/security-event-policy.test.mjs') failures.push('Security-event policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:support-policy'] !== 'node --test tests/support-ticket-policy.test.mjs') failures.push('Support-ticket policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:webhook-policy'] !== 'node --test tests/provider-webhook-policy.test.mjs') failures.push('Webhook policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:release-gates'] !== 'node --test tests/release-gate-policy.test.mjs') failures.push('Release gate test script is not registered in package.json.');
if (packageJson.scripts?.['test:financial-operation'] !== 'node --test tests/financial-operation-policy.test.mjs') failures.push('Financial-operation policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:recovery-policy'] !== 'node --test tests/backup-recovery-policy.test.mjs') failures.push('Backup/recovery policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:rate-limit'] !== 'node --test tests/rate-limit-policy.test.mjs') failures.push('Rate-limit policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:request-integrity'] !== 'node --test tests/request-integrity-policy.test.mjs') failures.push('Request-integrity policy test script is not registered in package.json.');
if (packageJson.scripts?.['test:integration-security'] !== 'node --test tests/integration-security-flow.test.mjs') failures.push('Security policy integration test script is not registered in package.json.');
if (packageJson.scripts?.['test:policy'] !== 'node --test tests/*.test.mjs') failures.push('Policy unit-test script is not registered in package.json.');
if (packageJson.scripts?.['test:access'] !== 'node --test tests/access-policy.test.mjs') failures.push('Authorization unit-test script is not registered in package.json.');
if (packageJson.scripts?.['test:server-auth'] !== 'node --test tests/server-authorization-boundary.test.mjs') failures.push('Server authorization boundary test script is not registered in package.json.');
if (packageJson.scripts?.['test:identity-contract'] !== 'node --test tests/verified-session-contract.test.mjs') failures.push('Verified-session contract test script is not registered in package.json.')

const healthPath = join(root, 'app/api/health/route.ts');
if (existsSync(healthPath)) {
  const health = readFileSync(healthPath, 'utf8');
  for (const flag of ['liveTrading: false', 'livePayments: false', 'liveWallets: false', 'liveWithdrawals: false', "ready: false", "status: 'scaffold'"]) {
    if (!health.includes(flag)) failures.push(`Health endpoint must explicitly keep ${flag.replace(': false', '')} disabled.`);
  }
}

const accountPath = join(root, 'app/account/page.tsx');
if (existsSync(accountPath)) {
  const account = readFileSync(accountPath, 'utf8');
  if (!account.includes('DEMO · NOT CONNECTED')) failures.push('Account page must disclose that authentication is not connected.');
  if (!account.includes('does not create an account')) failures.push('Account page must disclose that preview submission does not create an account.');
}

const configPath = join(root, 'next.config.ts');
if (existsSync(configPath)) {
  const config = readFileSync(configPath, 'utf8');
  for (const header of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    if (!config.includes(header)) failures.push(`Expected baseline security header is missing: ${header}`);
  }
  if (!config.includes("process.env.NODE_ENV === 'production'")) failures.push('HSTS must be limited to production mode.');
}

const schemaPath = join(root, 'prisma/schema.prisma');
if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, 'utf8');
  for (const field of ['tokenHash', 'emailVerifiedAt', 'beneficiaryNameMatch', 'holdReasonCode']) {
    if (!schema.includes(field)) failures.push(`Expected identity/session/withdrawal schema field is missing: ${field}`);
  }
}

const authPlanPath = join(root, 'docs/AUTHENTICATION-AND-AUTHORIZATION-IMPLEMENTATION-PLAN.md');
if (existsSync(authPlanPath)) {
  const authPlan = readFileSync(authPlanPath, 'utf8');
  for (const control of ['deny by default', 'CSRF', 'IDOR tests', 'fail closed', 'no production authentication is implemented']) {
    if (!authPlan.toLowerCase().includes(control.toLowerCase())) failures.push(`Authentication plan must document: ${control}`);
  }
}

const envExample = join(root, '.env.example');
if (existsSync(envExample)) {
  const env = readFileSync(envExample, 'utf8');
  if (/^(?!#)(?:AUTH_SECRET|OPENAI_API_KEY|PAYMENT_PROVIDER_SECRET|CUSTODY_PROVIDER_SECRET)=.+/m.test(env)) {
    failures.push('.env.example appears to contain a non-commented secret value.');
  }
}

if (failures.length) {
  console.error('ShieldChain preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`ShieldChain static preflight passed (${requiredFiles.length} required files checked).`);
  console.log('This is a repository consistency check, not a build, security audit, or production-readiness approval.');
}
