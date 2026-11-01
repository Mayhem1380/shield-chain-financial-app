import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRecoveryReadiness, evaluateRestoreApproval } from '../lib/backup-recovery-policy.mjs';

const ready = { backupExists: true, backupEncrypted: true, backupAgeHours: 2, maxBackupAgeHours: 24, restoreTestPassed: true, integrityCheckPassed: true, keyRecoveryConfirmed: true, ownerAssigned: true, incidentRunbookAvailable: true };
const approved = { authorizedOperator: true, changeTicketApproved: true, targetEnvironmentIsolated: true, sourceBackupIntegrityVerified: true, dataOwnerApproval: true, productionImpactAssessed: true };

test('recovery readiness passes only when all evidence is present', () => {
  assert.deepEqual(evaluateRecoveryReadiness(ready), { ready: true, reasons: [] });
});
test('missing restore test blocks readiness', () => {
  const result = evaluateRecoveryReadiness({ ...ready, restoreTestPassed: false });
  assert.equal(result.ready, false);
  assert.ok(result.reasons.includes('RESTORE_TEST_NOT_PASSED'));
});
test('old or invalid backup age fails closed', () => {
  assert.ok(evaluateRecoveryReadiness({ ...ready, backupAgeHours: 25 }).reasons.includes('BACKUP_TOO_OLD'));
  assert.ok(evaluateRecoveryReadiness({ ...ready, backupAgeHours: Number.NaN }).reasons.includes('BACKUP_AGE_UNKNOWN_OR_INVALID'));
});
test('restore approval requires isolation and authorized operator', () => {
  assert.deepEqual(evaluateRestoreApproval(approved), { approved: true, reasons: [] });
  const result = evaluateRestoreApproval({ ...approved, authorizedOperator: false, targetEnvironmentIsolated: false });
  assert.equal(result.approved, false);
  assert.ok(result.reasons.includes('OPERATOR_NOT_AUTHORIZED'));
  assert.ok(result.reasons.includes('RESTORE_TARGET_NOT_ISOLATED'));
});
test('empty inputs fail closed', () => {
  assert.equal(evaluateRecoveryReadiness().ready, false);
  assert.equal(evaluateRestoreApproval().approved, false);
});
