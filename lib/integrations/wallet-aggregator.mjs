// Server-only seam for the owner's existing Replit app. No app features are assumed.
export class WalletIntegrationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const deny = code => { throw new WalletIntegrationError(code); };
const sensitive = /^(?:private[-_]?key|seed(?:[-_]?phrase)?|recovery[-_]?phrase|signing[-_]?key|mnemonic|secret|password|api[-_]?key|access[-_]?token|refresh[-_]?token|authorization|cookie)$/i;

export function walletAggregatorStatus() {
  return { publishedApplicationUrl: 'https://wallet-aggregator.replit.app', configured: false, sourceInspected: false, enabledCapabilities: [], transactionsEnabled: false, reason: 'SOURCE_INSPECTION_REQUIRED' };
}

function assertReview(review, now) {
  if (!review || !/^[a-f0-9]{40,64}$/.test(review.sourceRevision || '') || !review.sourceReference || !review.reviewReference || !review.readOnlyCredentialReviewReference || !Number.isFinite(Date.parse(review.reviewedAt)) || Date.parse(review.reviewedAt) > now || !Number.isFinite(Date.parse(review.expiresAt)) || Date.parse(review.expiresAt) <= now || !Array.isArray(review.capabilities) || review.capabilities.length === 0) deny('WALLET_SOURCE_REVIEW_REQUIRED');
  const names = new Set();
  for (const capability of review.capabilities) {
    if (!/^[a-z][a-z0-9_]{1,60}$/.test(capability.name || '') || names.has(capability.name) || capability.effect !== 'READ' || !Array.isArray(capability.responseFields) || capability.responseFields.length === 0 || capability.responseFields.some(field => !/^[A-Za-z][A-Za-z0-9_]{0,60}$/.test(field) || sensitive.test(field))) deny('WALLET_REVIEWED_READ_CONTRACT_REQUIRED');
    names.add(capability.name);
  }
}

function assertSafeJson(value, depth = 0) {
  if (depth > 8) deny('WALLET_RESPONSE_REJECTED');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) { for (const item of value) assertSafeJson(item, depth + 1); return; }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, item] of Object.entries(value)) { if (sensitive.test(key)) deny('WALLET_SENSITIVE_RESPONSE_REJECTED'); assertSafeJson(item, depth + 1); }
    return;
  }
  deny('WALLET_RESPONSE_REJECTED');
}

// review, adapter and resolveSubject must come from trusted server configuration after
// source inspection. Validation is NOT proof that an inspection or credential audit occurred.
export function createWalletAggregatorBoundary({ review, adapter, resolveSubject, audit }) {
  return {
    async read({ request, capability: name }) {
      assertReview(review, Date.now());
      if (typeof resolveSubject !== 'function' || typeof adapter?.read !== 'function' || typeof audit !== 'function') deny('WALLET_ADAPTER_NOT_CONFIGURED');
      const capability = review.capabilities.find(item => item.name === name);
      if (!capability) deny('WALLET_CAPABILITY_NOT_REVIEWED');
      // Resolve and authorize ownership server-side; never accept a client-supplied wallet/user ID.
      const subject = await resolveSubject(request);
      if (!subject?.verified || !subject.userId || !subject.providerSubject || subject.active !== true) deny('WALLET_VERIFIED_OWNER_REQUIRED');
      const signal = AbortSignal.timeout(5000);
      let data;
      try {
        const response = await Promise.race([
          adapter.read({ subjectReference: subject.providerSubject, capability: name, signal }),
          new Promise((_, reject) => signal.addEventListener('abort', () => reject(new WalletIntegrationError('WALLET_PROVIDER_TIMEOUT')), { once: true })),
        ]);
        if (!response || Object.getPrototypeOf(response) !== Object.prototype) deny('WALLET_RESPONSE_REJECTED');
        assertSafeJson(response);
        if (Buffer.byteLength(JSON.stringify(response)) > 65536) deny('WALLET_RESPONSE_TOO_LARGE');
        data = Object.fromEntries(capability.responseFields.filter(field => Object.hasOwn(response, field)).map(field => [field, response[field]]));
      } catch (error) {
        await audit({ action: 'wallet.read.failed', userId: subject.userId, capability: name, sourceRevision: review.sourceRevision });
        throw new WalletIntegrationError(error instanceof WalletIntegrationError ? error.code : 'WALLET_PROVIDER_UNAVAILABLE');
      }
      await audit({ action: 'wallet.read.completed', userId: subject.userId, capability: name, sourceRevision: review.sourceRevision });
      return data;
    },
  };
}
