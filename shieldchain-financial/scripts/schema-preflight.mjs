import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const errors = [];
const requiredModels = ['User', 'AuthSession', 'AuditEvent', 'KycCase', 'WithdrawalRequest', 'SupportTicket', 'SupportMessage', 'Challenge'];
const requiredEnums = ['AccountStatus', 'AuditSeverity', 'KycStatus', 'WithdrawalStatus'];

for (const model of requiredModels) {
  if (!new RegExp(`\\bmodel\\s+${model}\\s*\\{`).test(schema)) errors.push(`Missing required model: ${model}`);
}
for (const name of requiredEnums) {
  if (!new RegExp(`\\benum\\s+${name}\\s*\\{`).test(schema)) errors.push(`Missing required enum: ${name}`);
}

const blocks = [...schema.matchAll(/\b(model|enum)\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
const models = new Map(blocks.filter((m) => m[1] === 'model').map((m) => [m[2], m[3]]));
const field = (model, name) => new RegExp(`^\\s*${name}\\s+`, 'm').test(models.get(model) ?? '');
const requiredFields = [
  ['User', 'email'], ['User', 'status'], ['User', 'emailVerifiedAt'],
  ['AuthSession', 'tokenHash'], ['AuthSession', 'expiresAt'], ['AuthSession', 'revokedAt'],
  ['AuditEvent', 'action'], ['AuditEvent', 'resource'], ['AuditEvent', 'createdAt'],
  ['KycCase', 'providerCaseId'], ['KycCase', 'status'],
  ['WithdrawalRequest', 'amount'], ['WithdrawalRequest', 'assetCode'],
  ['WithdrawalRequest', 'beneficiaryNameMatch'], ['WithdrawalRequest', 'holdReasonCode'],
  ['WithdrawalRequest', 'status'], ['SupportMessage', 'internal'],
];
for (const [model, name] of requiredFields) {
  if (!field(model, name)) errors.push(`${model} is missing required field: ${name}`);
}

const user = models.get('User') ?? '';
if (!/email\s+String\s+@unique/.test(user)) errors.push('User.email must remain unique.');
const session = models.get('AuthSession') ?? '';
if (!/tokenHash\s+String\s+@unique/.test(session)) errors.push('AuthSession.tokenHash must be unique.');
if (/password\s+String\s+@/.test(user)) errors.push('Do not add a raw password field to User; use an approved identity provider.');
const withdrawal = models.get('WithdrawalRequest') ?? '';
if (!/amount\s+Decimal\s+@db\.Decimal\(20,\s*8\)/.test(withdrawal)) errors.push('Withdrawal amount must use fixed-precision Decimal(20,8), not floating point.');
if (!/beneficiaryNameMatch\s+Boolean\?/.test(withdrawal)) errors.push('Beneficiary match must support an unresolved state; do not default to approval.');
if (!/holdReasonCode\s+String\?/.test(withdrawal)) errors.push('Withdrawal hold reason must be representable.');
if (!/@@index\(\[userId, status, requestedAt\]\)/.test(withdrawal)) errors.push('Expected user/status/time withdrawal index is missing.');

if (errors.length) {
  console.error('SF database schema preflight failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`SF database schema preflight passed (${requiredModels.length} required models, ${requiredEnums.length} required enums, ${requiredFields.length} required fields checked).`);
  console.log('This static check does not replace `prisma validate`, migration review, or tests against a real PostgreSQL instance.');
}
