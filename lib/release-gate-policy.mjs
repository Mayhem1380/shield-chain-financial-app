/** Release decision helper. This does not deploy code, configure providers or enable financial services. */
const deny = (code, missing = []) => ({ allowed: false, code, missing });
const requiredGates = [
  'identityProviderConfigured', 'databaseMigrationsReviewed', 'backupRestoreTested',
  'independentSecurityReview', 'incidentOwnerAssigned', 'supportProcessReady',
  'legalAndRegulatoryReview', 'monitoringAndAlertingReady', 'rollbackTested',
  'explicitReleaseApproval'
];
export function evaluateReleaseGate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('RELEASE_CONTEXT_INVALID');
  if (!['local', 'private_beta', 'production'].includes(input.target)) return deny('RELEASE_TARGET_INVALID');
  const missing = requiredGates.filter((key) => input.gates?.[key] !== true);
  if (missing.length) return deny('RELEASE_GATES_INCOMPLETE', missing);
  if (input.target === 'production' && input.productionChangeWindowApproved !== true) return deny('PRODUCTION_CHANGE_WINDOW_NOT_APPROVED');
  return { allowed: true, code: 'RELEASE_GATE_POLICY_ALLOWED', target: input.target, requiredGates: [...requiredGates] };
}
export function evaluateLiveCapability(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return deny('CAPABILITY_CONTEXT_INVALID');
  const capability = input.capability;
  if (!['trading', 'payments', 'wallets', 'withdrawals'].includes(capability)) return deny('CAPABILITY_INVALID');
  if (input.enabled !== true) return deny('CAPABILITY_DISABLED');
  const prerequisites = ['releaseGatePassed', 'providerApproved', 'serverSideAuthorizationTested', 'reconciliationReady', 'fraudAndAbuseControlsReady', 'customerDisclosureApproved', 'operationalOwnerAssigned'];
  const missing = prerequisites.filter((key) => input[key] !== true);
  if (missing.length) return deny('LIVE_CAPABILITY_GATES_INCOMPLETE', missing);
  return { allowed: true, code: 'LIVE_CAPABILITY_POLICY_ALLOWED', capability };
}
