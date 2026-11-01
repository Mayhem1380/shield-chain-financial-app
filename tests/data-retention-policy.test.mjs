import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRetentionAction } from '../lib/data-retention-policy.mjs';
const base = { dataClass: 'SUPPORT_CONTENT', recordId: 'rec_123', createdAt: 0, now: 10 * 86400000, retentionDays: 7, legalHold: false };
test('marks ordinary expired content eligible for reviewed deletion, not automatic deletion', () => { const r = evaluateRetentionAction(base); assert.equal(r.action, 'ELIGIBLE_FOR_REVIEWED_DELETION'); });
test('preserves legal holds', () => { assert.equal(evaluateRetentionAction({ ...base, legalHold: true }).code, 'LEGAL_HOLD_ACTIVE'); });
test('requires review for identity evidence and financial records', () => { assert.equal(evaluateRetentionAction({ ...base, dataClass: 'IDENTITY_EVIDENCE' }).action, 'PRIVACY_COMPLIANCE_REVIEW'); assert.equal(evaluateRetentionAction({ ...base, dataClass: 'FINANCIAL_RECORD', deletionRequested: true }).action, 'PRIVACY_REVIEW_REQUIRED'); });
test('rejects invalid classes, IDs, clocks and retention periods', () => { assert.equal(evaluateRetentionAction({ ...base, dataClass: 'UNKNOWN' }).code, 'DATA_CLASS_INVALID'); assert.equal(evaluateRetentionAction({ ...base, recordId: '../secret' }).code, 'RECORD_ID_INVALID'); assert.equal(evaluateRetentionAction({ ...base, createdAt: 11, now: 10 }).code, 'RETENTION_CLOCK_INVALID'); assert.equal(evaluateRetentionAction({ ...base, retentionDays: 0 }).code, 'RETENTION_PERIOD_INVALID'); });
test('keeps records while within retention period', () => { assert.equal(evaluateRetentionAction({ ...base, now: 2 * 86400000 }).action, 'KEEP'); });
