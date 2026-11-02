/** Pure backup/recovery decision policy. Does not create backups or restore data. */
export function evaluateRecoveryReadiness(input = {}) {
  const reasons = [];
  if (input.backupExists !== true) reasons.push('BACKUP_NOT_CONFIRMED');
  if (input.backupEncrypted !== true) reasons.push('BACKUP_ENCRYPTION_NOT_CONFIRMED');
  if (input.backupAgeHours == null || !Number.isFinite(input.backupAgeHours) || input.backupAgeHours < 0) reasons.push('BACKUP_AGE_UNKNOWN_OR_INVALID');
  else if (input.maxBackupAgeHours == null || !Number.isFinite(input.maxBackupAgeHours) || input.maxBackupAgeHours < 0) reasons.push('MAX_BACKUP_AGE_INVALID');
  else if (input.backupAgeHours > input.maxBackupAgeHours) reasons.push('BACKUP_TOO_OLD');
  if (input.restoreTestPassed !== true) reasons.push('RESTORE_TEST_NOT_PASSED');
  if (input.integrityCheckPassed !== true) reasons.push('INTEGRITY_CHECK_NOT_PASSED');
  if (input.keyRecoveryConfirmed !== true) reasons.push('KEY_RECOVERY_NOT_CONFIRMED');
  if (input.ownerAssigned !== true) reasons.push('RECOVERY_OWNER_NOT_ASSIGNED');
  if (input.incidentRunbookAvailable !== true) reasons.push('INCIDENT_RUNBOOK_NOT_AVAILABLE');
  return Object.freeze({ ready: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function evaluateRestoreApproval(input = {}) {
  const reasons = [];
  if (input.authorizedOperator !== true) reasons.push('OPERATOR_NOT_AUTHORIZED');
  if (input.changeTicketApproved !== true) reasons.push('CHANGE_TICKET_NOT_APPROVED');
  if (input.targetEnvironmentIsolated !== true) reasons.push('RESTORE_TARGET_NOT_ISOLATED');
  if (input.sourceBackupIntegrityVerified !== true) reasons.push('SOURCE_BACKUP_NOT_VERIFIED');
  if (input.dataOwnerApproval !== true) reasons.push('DATA_OWNER_APPROVAL_REQUIRED');
  if (input.productionImpactAssessed !== true) reasons.push('PRODUCTION_IMPACT_NOT_ASSESSED');
  return Object.freeze({ approved: reasons.length === 0, reasons: Object.freeze(reasons) });
}
