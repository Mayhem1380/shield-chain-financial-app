import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');
const schema = read('prisma/schema.prisma');
const authPlan = read('docs/AUTHENTICATION-AND-AUTHORIZATION-IMPLEMENTATION-PLAN.md');
const withdrawalPlan = read('docs/IDENTITY-AND-WITHDRAWAL-CONTROL-PLAN.md');
const health = read('app/api/health/route.ts');
const account = read('app/account/page.tsx');
const config = read('next.config.ts');
const policy = read('lib/withdrawal-policy.mjs');
const policyTests = read('tests/withdrawal-policy.test.mjs');
const accessPolicy = read('lib/access-policy.mjs');
const accessTests = read('tests/access-policy.test.mjs');
const accessPlan = read('docs/AUTHORIZATION-POLICY-FOUNDATION.md');
const serverBoundary = read('lib/server-authorization-boundary.mjs');
const serverBoundaryTests = read('tests/server-authorization-boundary.test.mjs');
const serverBoundaryPlan = read('docs/SERVER-AUTHORIZATION-BOUNDARY.md');
const sessionContract = read('lib/verified-session-contract.mjs');
const sessionContractTests = read('tests/verified-session-contract.test.mjs');
const sessionContractPlan = read('docs/VERIFIED-SESSION-CONTRACT.md');
const authFlow = read('lib/auth-flow-policy.mjs');
const authFlowTests = read('tests/auth-flow-policy.test.mjs');
const authFlowPlan = read('docs/AUTHENTICATION-FLOW-POLICY.md');
const retentionPolicy = read('lib/data-retention-policy.mjs');
const retentionTests = read('tests/data-retention-policy.test.mjs');
const securityEventPolicy = read('lib/security-event-policy.mjs');
const securityEventTests = read('tests/security-event-policy.test.mjs');
const supportPolicy = read('lib/support-ticket-policy.mjs');
const supportTests = read('tests/support-ticket-policy.test.mjs');
const webhookPolicy = read('lib/provider-webhook-policy.mjs');
const webhookTests = read('tests/provider-webhook-policy.test.mjs');
const webhookPlan = read('docs/PROVIDER-WEBHOOK-INTEGRATION-CONTRACT.md');
const releasePolicy = read('lib/release-gate-policy.mjs');
const releaseTests = read('tests/release-gate-policy.test.mjs');
const releasePlan = read('docs/RELEASE-GATES-AND-CAPABILITY-FLAGS.md');
const recoveryPolicy = read('lib/backup-recovery-policy.mjs');
const recoveryTests = read('tests/backup-recovery-policy.test.mjs');
const recoveryPlan = read('docs/BACKUP-AND-DISASTER-RECOVERY-GATES.md');
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.message }); }
}

check('Session tokens are represented by unique hashes', () => {
  assert.match(schema, /model AuthSession[\s\S]*?tokenHash\s+String\s+@unique/);
  assert.match(schema, /model AuthSession[\s\S]*?expiresAt\s+DateTime/);
  assert.match(schema, /model AuthSession[\s\S]*?revokedAt\s+DateTime\?/);
});
check('Account states include restricted and closed', () => {
  assert.match(schema, /enum AccountStatus[\s\S]*?RESTRICTED[\s\S]*?CLOSED/);
});
check('Withdrawal data supports fail-closed review', () => {
  assert.match(schema, /beneficiaryNameMatch\s+Boolean\?/);
  assert.match(schema, /holdReasonCode\s+String\?/);
  assert.match(schema, /enum WithdrawalStatus[\s\S]*?IDENTITY_CHECK[\s\S]*?RISK_REVIEW[\s\S]*?APPROVED/);
  assert.match(withdrawalPlan, /failed|mismatch|hold/i);
});
check('Authentication plan explicitly requires server-side access controls', () => {
  for (const phrase of ['deny by default', 'CSRF', 'IDOR tests', 'fail closed']) assert.ok(authPlan.toLowerCase().includes(phrase.toLowerCase()), `Missing: ${phrase}`);
});
check('Prototype clearly discloses authentication is not connected', () => {
  assert.match(account, /DEMO · NOT CONNECTED/);
  assert.match(authPlan, /no production authentication is implemented/i);
});
check('Live financial capabilities remain disabled', () => {
  for (const flag of ['liveTrading: false', 'livePayments: false', 'liveWallets: false', 'liveWithdrawals: false']) assert.ok(health.includes(flag), `Missing disabled capability: ${flag}`);
  assert.match(health, /ready:\s*false/);
});
check('Withdrawal policy fails closed and keeps execution out of scope', () => {
  for (const code of ['BENEFICIARY_MISMATCH_OR_UNKNOWN', 'KYC_EXPIRED_OR_CLOCK_INVALID', 'PROTECTIVE_HOLD_PRESENT_OR_UNKNOWN', 'AMOUNT_FORMAT_INVALID']) assert.ok(policy.includes(code), `Missing fail-closed reason: ${code}`);
  assert.match(policy, /does not create, approve, queue, or execute a withdrawal/i);
  assert.match(policyTests, /prevents reopening terminal states/i);
});
check('Authorization policy denies by default and separates staff permissions', () => {
  for (const phrase of ['SESSION_INVALID', 'ACCOUNT_NOT_ACTIVE', 'STAFF_MFA_REQUIRED', 'RESOURCE_NOT_OWNED', 'STEP_UP_REQUIRED']) assert.ok(accessPolicy.includes(phrase), `Missing access control: ${phrase}`);
  assert.match(accessPolicy, /rolePermissions/);
  assert.match(accessPolicy, /role membership alone never grants a permission/i);
  assert.match(accessTests, /administrator role does not implicitly grant withdrawal approval/);
  assert.match(accessPlan, /not connected to sessions, routes, Prisma, or a live identity provider/i);
});
check('Server authorization boundary fails closed without trusted identity and server-loaded ownership', () => {
  for (const phrase of ['IDENTITY_PROVIDER_NOT_CONFIGURED', 'SESSION_RESOLUTION_FAILED', 'RESOURCE_CONTEXT_UNAVAILABLE']) assert.ok(serverBoundary.includes(phrase), `Missing fail-closed result: ${phrase}`);
  assert.match(serverBoundary, /evaluateAccess/);
  assert.match(serverBoundaryTests, /client-supplied user header/);
  assert.match(serverBoundaryTests, /denies another user resource/);
  assert.match(serverBoundaryPlan, /not authentication by itself/i);
});
check('Verified session contract validates expiry, verified email, roles and MFA without leaking provider tokens', () => {
  for (const phrase of ['SESSION_NOT_VERIFIED', 'EMAIL_NOT_VERIFIED', 'ROLE_INVALID', 'SESSION_EXPIRED_OR_CLOCK_INVALID', 'MFA_STATE_REQUIRED']) assert.ok(sessionContract.includes(phrase), `Missing session guard: ${phrase}`);
  assert.match(sessionContractTests, /accessToken/);
  assert.match(sessionContractTests, /does not carry arbitrary provider claims/);
  assert.match(sessionContractPlan, /does not authenticate anyone/i);
});
check('Authentication flow policies cover MFA, recovery enumeration, one-time tokens and rate limits', () => {
  for (const code of ['CREDENTIALS_NOT_VERIFIED', 'EMAIL_NOT_VERIFIED', 'MFA_REQUIRED', 'TOKEN_ALREADY_USED', 'TOKEN_EXPIRED', 'ATTEMPT_RATE_LIMITED']) assert.ok(authFlow.includes(code), `Missing auth-flow guard: ${code}`);
  assert.match(authFlow, /does not verify passwords\/tokens,[\s\S]*?create sessions, or authenticate a user/i);
  assert.match(authFlowTests, /does not reveal whether an account exists/);
  assert.match(authFlowPlan, /consume them atomically/i);
});
check('Retention policy preserves legal holds and routes sensitive classes for review', () => {
  for (const phrase of ['LEGAL_HOLD_ACTIVE', 'PRIVACY_COMPLIANCE_REVIEW', 'PRIVACY_REVIEW_REQUIRED', 'ELIGIBLE_FOR_REVIEWED_DELETION']) assert.ok(retentionPolicy.includes(phrase), `Missing retention guard: ${phrase}`);
  assert.match(retentionTests, /preserves legal holds/);
});
check('Security event logging allowlists event types and avoids sensitive metadata', () => {
  for (const phrase of ['EVENT_TYPE_NOT_ALLOWED', 'CORRELATION_ID_INVALID', 'METADATA_TOO_LARGE', 'redactForSecurityLog']) assert.ok(securityEventPolicy.includes(phrase), `Missing event-log guard: ${phrase}`);
  assert.match(securityEventTests, /redacts sensitive keys/);
});
check('Support workflow enforces ownership, restricted queues and internal-note visibility', () => {
  for (const phrase of ['TICKET_NOT_OWNED', 'RESTRICTED_QUEUE_ROLE_REQUIRED', 'SENSITIVE_SECRET_CONTENT_BLOCKED']) assert.ok(supportPolicy.includes(phrase), `Missing support guard: ${phrase}`);
  assert.match(supportPolicy, /canReadTicketMessage/);
  assert.match(supportTests, /internal notes never appear to customers/);
});
check('Provider webhook policy requires verified signature, recent timestamp, allowlisted type and idempotency state', () => {
  for (const code of ['WEBHOOK_SIGNATURE_NOT_VERIFIED', 'WEBHOOK_REPLAY_DETECTED', 'WEBHOOK_TIMESTAMP_OUTSIDE_WINDOW', 'WEBHOOK_IDEMPOTENCY_STATE_UNKNOWN']) assert.ok(webhookPolicy.includes(code), `Missing webhook guard: ${code}`);
  assert.match(webhookTests, /duplicate delivery/);
  assert.match(webhookPlan, /atomically claim a unique idempotency key/i);
});
check('Backup recovery requires tested restore, integrity, key recovery and controlled approval', () => {
  for (const code of ['RESTORE_TEST_NOT_PASSED', 'INTEGRITY_CHECK_NOT_PASSED', 'KEY_RECOVERY_NOT_CONFIRMED', 'RESTORE_TARGET_NOT_ISOLATED']) assert.ok(recoveryPolicy.includes(code), `Missing recovery guard: ${code}`);
  assert.match(recoveryTests, /empty inputs fail closed/);
  assert.match(recoveryPlan, /Never overwrite production as an exploratory test/);
});
check('Release and live capability policy fail closed on incomplete gates', () => {
  for (const code of ['RELEASE_GATES_INCOMPLETE', 'PRODUCTION_CHANGE_WINDOW_NOT_APPROVED', 'LIVE_CAPABILITY_GATES_INCOMPLETE']) assert.ok(releasePolicy.includes(code), `Missing release guard: ${code}`);
  assert.match(releaseTests, /live capability fails closed/);
  assert.match(releasePlan, /remain disabled by default/i);
});
check('Baseline security headers and private-route cache controls remain configured', () => {
  for (const header of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'X-Permitted-Cross-Domain-Policies', 'Origin-Agent-Cluster']) assert.ok(config.includes(header), `Missing header: ${header}`);
  for (const route of ["source: '/account/:path*'", "source: '/admin/:path*'", "source: '/api/:path*'"]) assert.ok(config.includes(route), `Missing no-store route rule: ${route}`);
  assert.match(config, /Cache-Control', value: 'no-store, max-age=0'/);
  assert.match(config, /process.env.NODE_ENV === 'production'/);
});

const rateLimitPolicy = read('lib/rate-limit-policy.mjs');
const rateLimitTests = read('tests/rate-limit-policy.test.mjs');
const rateLimitPlan = read('docs/RATE-LIMITING-AND-ABUSE-RESILIENCE.md');
check('Rate limiting requires trusted subjects and fail-closed shared-store behavior for sensitive routes', () => {
  for (const code of ['RATE_LIMIT_STORE_UNAVAILABLE', 'RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_SUBJECT_INVALID', 'RATE_LIMIT_WINDOW_IN_FUTURE']) assert.ok(rateLimitPolicy.includes(code), `Missing rate-limit guard: ${code}`);
  assert.match(rateLimitTests, /fails closed when the shared store is unavailable/);
  assert.match(rateLimitPlan, /atomic shared store/i);
  assert.match(rateLimitPlan, /Do not trust a user-supplied identity/i);
});

const financialPolicy = read('lib/financial-operation-policy.mjs');
const financialTests = read('tests/financial-operation-policy.test.mjs');
check('Financial operation policy keeps live capabilities disabled by default and requires atomic state-change prerequisites', () => {
  for (const code of ['LIVE_CAPABILITY_DISABLED', 'SERVER_AUTHORIZATION_REQUIRED', 'IDEMPOTENCY_STATE_UNKNOWN', 'REVIEWED_QUOTE_REQUIRED', 'RISK_CHECKS_REQUIRED', 'STATE_CHANGE_PREREQUISITES_MISSING']) assert.ok(financialPolicy.includes(code), `Missing financial-operation guard: ${code}`);
  assert.match(financialTests, /live financial capability remains denied by default/);
  assert.match(financialTests, /state change admitted only with ledger/);
});

const headersPlan = read('docs/SECURITY-HEADERS-AND-CACHE-CONTROLS.md');
check('Security header documentation warns that headers do not replace authorization and CSP requires deployment review', () => {
  assert.match(headersPlan, /do not replace authorization/i);
  assert.match(headersPlan, /CSP must be designed and tested/i);
  assert.match(headersPlan, /verify actual response headers/i);
});

const requestIntegrity = read('lib/request-integrity-policy.mjs');
const requestIntegrityTests = read('tests/request-integrity-policy.test.mjs');
const requestIntegrityPlan = read('docs/REQUEST-INTEGRITY-AND-CSRF-FOUNDATION.md');
check('Browser request-integrity policy requires exact origin, JSON content type, CSRF match and rejects cross-site mutations', () => {
  for (const code of ['ORIGIN_NOT_ALLOWED', 'UNSAFE_CONTENT_TYPE', 'CSRF_TOKEN_MISMATCH', 'CROSS_SITE_MUTATION_BLOCKED']) assert.ok(requestIntegrity.includes(code), `Missing request-integrity guard: ${code}`);
  assert.match(requestIntegrity, /timingSafeEqual/);
  assert.match(requestIntegrityTests, /rejects mismatched CSRF tokens/);
  assert.match(requestIntegrityPlan, /CSRF is not authentication or authorization/i);
});


for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${item.error ? ` — ${item.error}` : ''}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} static security regression checks passed.`);
console.log('These checks inspect repository text only. They do not exercise a running app, database, identity provider, or withdrawal flow.');
if (failed.length) process.exitCode = 1;

