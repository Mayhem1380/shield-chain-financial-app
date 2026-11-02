import { SfWalletError, CHAINS, WALLET_GATES, checkedAddress, chainByKey, units, transactionCsv, publicAddressQr, assertWalletFields, assertExternalVaultReference } from './policy.mjs';
import { createChainReader, discoverTransactionHashes, configuredRpcUrls } from './chain-reader.mjs';
import { krakenReadOnlyBalances } from './exchange-reader.mjs';

async function lock(tx, id) { await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtext(${id}))`; }
async function audit(tx, userId, action, id, metadata = {}) { await tx.auditEvent.create({ data: { actorUserId: userId, action, resource: 'sf-wallet', resourceId: id, metadata } }); }
function publicAddressView(row) {
  return { id: row.id, chainKey: row.chainKey, publicAddress: row.publicAddress, label: row.label, createdAt: row.createdAt, snapshots: (row.snapshots || []).map(snapshot => ({ ...snapshot, balance: units(snapshot.rawBalance, snapshot.decimals), stale: Date.now() - new Date(snapshot.observedAt).getTime() > 15 * 60000 })) };
}

export function createSfWalletService({ db, validateAddress = checkedAddress, chainReader = (key, options) => createChainReader(key, options), discover = (key, address, options) => discoverTransactionHashes(key, address, fetch, options?.signal), resolveExchangeSecret } = {}) {
  async function owned(userId, addressId, client = db) {
    if (typeof addressId !== 'string' || addressId.length > 100) throw new SfWalletError('ADDRESS_ID_REQUIRED');
    const address = await client.sfWalletAddress.findFirst({ where: { id: addressId, userId, archivedAt: null } });
    if (!address) throw new SfWalletError('TRACKED_ADDRESS_NOT_FOUND', 404);
    return address;
  }
  return {
    async portfolio(userId) {
      const addresses = await db.sfWalletAddress.findMany({ where: { userId, archivedAt: null }, orderBy: { createdAt: 'asc' }, take: 50, include: { snapshots: { orderBy: { observedAt: 'desc' }, take: 1 } } });
      const exchanges = await db.sfExchangeConnection.findMany({ where: { userId }, take: 20, select: { id: true, provider: true, enabled: true, snapshots: { orderBy: { observedAt: 'desc' }, take: 1, select: { balances: true, observedAt: true, scopeCheckedAt: true } } } });
      const chains = Object.values(CHAINS).map(chain => { let configured = false; try { configuredRpcUrls(chain.key); configured = true; } catch {} return { ...chain, rpcConfigured: configured }; });
      await db.$transaction(tx => audit(tx, userId, 'sf-wallet.portfolio.viewed', null, { addresses: addresses.length }));
      return { addresses: addresses.map(publicAddressView), exchanges, chains, gates: WALLET_GATES, vault: { mode: 'METADATA_ONLY', custodyEnabled: false, credentialResolverConfigured: typeof resolveExchangeSecret === 'function' }, valuation: 'NOT_CONNECTED' };
    },
    async track(userId, input) {
      assertWalletFields(input, ['chainKey', 'publicAddress', 'label']);
      const chain = chainByKey(input.chainKey);
      const address = await validateAddress(input.publicAddress);
      if (typeof input.label !== 'string' || !input.label.trim() || input.label.length > 60 || /[\x00-\x1f]/.test(input.label)) throw new SfWalletError('ADDRESS_LABEL_INVALID');
      return db.$transaction(async tx => {
        await lock(tx, `sf-wallet-addresses:${userId}`);
        const existing = await tx.sfWalletAddress.findUnique({ where: { userId_chainKey_publicAddress: { userId, chainKey: chain.key, publicAddress: address } } });
        if (existing?.archivedAt !== null && await tx.sfWalletAddress.count({ where: { userId, archivedAt: null } }) >= 50) throw new SfWalletError('TRACKED_ADDRESS_LIMIT_REACHED', 409);
        const row = await tx.sfWalletAddress.upsert({ where: { userId_chainKey_publicAddress: { userId, chainKey: chain.key, publicAddress: address } }, create: { userId, chainKey: chain.key, publicAddress: address, label: input.label.trim() }, update: { archivedAt: null, label: input.label.trim() } });
        await tx.sfWalletVault.upsert({ where: { userId }, create: { userId }, update: {} });
        await audit(tx, userId, 'sf-wallet.address.tracked', row.id, { chainKey: chain.key });
        return publicAddressView(row);
      });
    },
    async archive(userId, addressId) {
      return db.$transaction(async tx => { await lock(tx, `sf-wallet:${addressId}`); const row = await owned(userId, addressId, tx); await tx.sfWalletAddress.update({ where: { id: row.id }, data: { archivedAt: new Date() } }); await audit(tx, userId, 'sf-wallet.address.archived', row.id); return { archived: true }; });
    },
    async refresh(userId, addressId) {
      const address = await owned(userId, addressId);
      const signal = AbortSignal.timeout(25000);
      const reader = chainReader(address.chainKey, { signal });
      const snapshot = await reader.balance(address.publicAddress);
      let historyStatus = 'CORROBORATED', hasMore = false, rejected = 0; const transactions = [];
      try {
        const page = await discover(address.chainKey, address.publicAddress, { signal }); hasMore = page.hasMore;
        // Bounded batches; indexer candidates are never stored as verified without RPC checks.
        for (let index = 0; index < page.hashes.length; index += 2) {
          const batch = await Promise.allSettled(page.hashes.slice(index, index + 2).map(hash => reader.transaction(address.publicAddress, hash, snapshot.blockNumber)));
          for (const result of batch) { if (result.status === 'fulfilled') transactions.push(result.value); else rejected++; }
          if (signal.aborted) { rejected += Math.max(0, page.hashes.length - index - 2); break; }
        }
        if (rejected) historyStatus = 'PARTIAL';
      } catch { historyStatus = 'INDEXER_UNAVAILABLE'; }
      await db.$transaction(async tx => {
        await lock(tx, `sf-wallet:${addressId}`);
        await owned(userId, addressId, tx);
        const latest = await tx.sfWalletSnapshot.findFirst({ where: { addressId }, orderBy: { observedAt: 'desc' } });
        if (latest && BigInt(latest.blockNumber) > BigInt(snapshot.blockNumber)) throw new SfWalletError('STALE_CHAIN_SNAPSHOT_REJECTED', 409);
        if (latest && latest.blockNumber === snapshot.blockNumber && latest.blockHash !== snapshot.blockHash) throw new SfWalletError('FINALIZED_CHAIN_CONFLICT', 502);
        if (latest && latest.blockNumber === snapshot.blockNumber && latest.rawBalance !== snapshot.rawBalance) throw new SfWalletError('FINALIZED_BALANCE_CONFLICT', 502);
        await tx.sfWalletSnapshot.upsert({ where: { addressId_blockHash: { addressId, blockHash: snapshot.blockHash } }, create: { addressId, ...snapshot }, update: { observedAt: snapshot.observedAt } });
        for (const transaction of transactions) {
          const existing = await tx.sfWalletTransaction.findUnique({ where: { addressId_hash: { addressId, hash: transaction.hash } } });
          if (existing && ['blockHash', 'rawValue', 'fromAddress', 'toAddress', 'status'].some(field => existing[field] !== transaction[field])) throw new SfWalletError('FINALIZED_TRANSACTION_CONFLICT', 502);
          await tx.sfWalletTransaction.upsert({ where: { addressId_hash: { addressId, hash: transaction.hash } }, create: { addressId, ...transaction }, update: { observedAt: transaction.observedAt } });
        }
        await audit(tx, userId, 'sf-wallet.address.refreshed', addressId, { verification: snapshot.verification, historyStatus, transactions: transactions.length, rejected });
      });
      return { snapshot: { ...snapshot, balance: units(snapshot.rawBalance, snapshot.decimals) }, historyStatus, hasMore, verifiedTransactions: transactions.length, rejected };
    },
    async history(userId, addressId) {
      const address = await owned(userId, addressId);
      const rows = await db.sfWalletTransaction.findMany({ where: { addressId }, orderBy: { timestamp: 'desc' }, take: 1000 });
      await db.$transaction(tx => audit(tx, userId, 'sf-wallet.history.viewed', addressId, { rows: rows.length }));
      return { address: publicAddressView(address), transactions: rows.map(row => ({ ...row, nativeAmount: units(row.rawValue, chainByKey(address.chainKey).decimals) })), scope: 'RECENT_EXTERNAL_NATIVE_TRANSACTIONS', limit: 1000 };
    },
    async exportCsv(userId, addressId) {
      const data = await this.history(userId, addressId);
      await db.$transaction(tx => audit(tx, userId, 'sf-wallet.history.exported', addressId, { rows: data.transactions.length }));
      return transactionCsv(data.transactions.map(row => ({ ...row, chainKey: data.address.chainKey, publicAddress: data.address.publicAddress, label: data.address.label, timestamp: new Date(row.timestamp).toISOString() })));
    },
    async qrPayload(userId, addressId) {
      const address = await owned(userId, addressId);
      await db.$transaction(tx => audit(tx, userId, 'sf-wallet.address.qr-requested', addressId));
      return publicAddressQr(address.chainKey, address.publicAddress);
    },
    async refreshExchange(userId, connectionId) {
      if (typeof connectionId !== 'string' || !connectionId || connectionId.length > 100) throw new SfWalletError('EXCHANGE_CONNECTION_ID_REQUIRED');
      if (typeof resolveExchangeSecret !== 'function') throw new SfWalletError('EXTERNAL_CREDENTIAL_VAULT_NOT_CONFIGURED', 503);
      const connection = await db.sfExchangeConnection.findFirst({ where: { id: connectionId, userId, enabled: true }, include: { vault: true } });
      if (!connection || connection.vault.userId !== userId || connection.provider !== 'KRAKEN' || !connection.scopeReviewReference) throw new SfWalletError('READ_ONLY_EXCHANGE_CONNECTION_NOT_APPROVED', 403);
      assertExternalVaultReference(connection.secretReference);
      const outcome = await db.$transaction(async tx => {
        await lock(tx, `sf-exchange:${connection.id}`);
        const current = await tx.sfExchangeConnection.findUniqueOrThrow({ where: { id: connection.id }, include: { vault: true } });
        if (current.userId !== userId || current.vault.userId !== userId || !current.enabled || current.secretReference !== connection.secretReference || !current.scopeReviewReference) throw new SfWalletError('READ_ONLY_EXCHANGE_CONNECTION_NOT_APPROVED', 403);
        const credentials = await resolveExchangeSecret({ userId, connectionId: connection.id, secretReference: current.secretReference });
        let nonce = current.lastNonce;
        const nextNonce = async () => { const clock = BigInt(Date.now()) * 1000n; nonce = nonce + 1n > clock ? nonce + 1n : clock; await tx.sfExchangeConnection.update({ where: { id: connection.id }, data: { lastNonce: nonce } }); return nonce.toString(); };
        // Catch inside the transaction so consumed nonces are committed even on provider failure.
        try {
          const result = await krakenReadOnlyBalances({ credentials, nextNonce });
          await tx.sfExchangeSnapshot.create({ data: { connectionId: connection.id, balances: result.balances, scopeCheckedAt: result.scopeCheckedAt, observedAt: result.observedAt } });
          await audit(tx, userId, 'sf-wallet.exchange.refreshed', connection.id, { provider: 'KRAKEN' });
          return result;
        } catch {
          await audit(tx, userId, 'sf-wallet.exchange.read-rejected', connection.id, { provider: 'KRAKEN' });
          return { error: 'READ_ONLY_EXCHANGE_CHECK_FAILED' };
        }
      }, { maxWait: 5000, timeout: 60000 });
      if (outcome.error) throw new SfWalletError('READ_ONLY_EXCHANGE_CHECK_FAILED', 502);
      return outcome;
    },
  };
}
