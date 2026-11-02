# SF Wallet — new read-only module, stage 1

Owner approved building a fresh SF Wallet rather than integrating Loop2Find or Wallet
Aggregator source. This is an additive module at `/sf-wallet`; the original `/wallet`
preview, existing platform, account/session system, subscriptions, dashboards, old adapter
and recovery history are preserved. No old application source was copied or imported.

## Implemented scope

Responsive black/deep-gold/electric-blue dashboard, account-linked public-address tracking,
Ethereum/Base/Polygon native-asset views, corroborated snapshots, recent external native
transaction history, CSV export, public-address QR generation and local image/camera scan,
Kraken read-only balance adapter, external-vault reference architecture and audit logging.
This is not a finished all-chain/all-token wallet. ERC-20/NFT/internal-call history, full
paginated backfill, Bitcoin/Solana adapters and fiat market valuation are not implemented
in this stage. No fabricated prices, market returns, account balances or transactions are
shown. No ownership of a public address is inferred from adding it to a watchlist.

## Balance and history verification

Each chain requires two separately configured, reviewed HTTPS RPC providers on distinct
approved hostnames. The server checks both chain IDs, selects a finalized block, compares
the exact block hash/height/timestamp at both providers, then requests balances using the
EIP-1898 block-hash reference with requireCanonical. Quantities are unsigned 256-bit hex,
stored as exact decimal strings and rendered using BigInt arithmetic. Finalized data
older than two hours is rejected. Conflicting block hashes/balances or older snapshots
cannot overwrite newer evidence. UI snapshots older than 15 minutes are marked stale,
with block hash, height and observation time always available.

This is **two-RPC corroboration**, not an independently verified consensus/light client
or Merkle proof. Distinct hosts do not establish operational independence: provider
independence, data accuracy, terms and outage behaviour require review. RPC providers
that do not support finalized/EIP-1898 reads fail closed; no weaker fallback is used.

Blockscout is used only to discover candidate hashes. A history row is stored only after
two RPC providers agree on transaction/receipt, address involvement, finality and canonical
block. Pending/inconsistent/unrelated records are rejected. Failed transactions record
zero native value transferred; gas costs are not represented as transfers. Token transfers
and internal calls are excluded. Refresh processes at most 10 candidates under a 25-second
shared deadline and bounded concurrency. Partial/unavailable history is disclosed and
previous corroborated records remain. CSV exports include at most 1,000 stored records
for one owned address; they are not a claim of complete historical coverage.

## Customer accounts and database

All API reads/mutations require a verified active DB session. Mutations require exact
HTTPS origin and JSON content type; archive and exchange refresh require recent MFA.
Ownership is loaded server-side before provider access. Rate limits are shared in the DB,
with separate read/write/export/refresh buckets. Address quota is 50 active records per
account. Deletion is a metadata-only archive; no on-chain action occurs. Refresh/metadata/
history writes and audit records are transactional. Audit failures do not produce a
successful data response or committed metadata change. Audit metadata excludes raw
addresses, labels, API secrets and full provider responses.

New Prisma models: SfWalletAddress, SfWalletSnapshot, SfWalletTransaction, SfWalletVault,
SfExchangeConnection and SfExchangeSnapshot. No schema change has been applied to a real
database. Generate and review an additive migration after dependency installation; test
against disposable PostgreSQL, then compare with the actual original DB before upgrades.
Never reset a customer database. Require TLS, encrypted storage/backups, least-privilege
runtime roles, separate migration/admin roles, protected append-only audit permissions,
retention/deletion policy and tested restore before production use. Public addresses linked
to customer accounts are privacy-sensitive metadata even though chain data is public.

## Vault and read-only exchange architecture

SfWalletVault is **METADATA_ONLY**. It stores no wallet private keys, recovery phrases,
passwords or API credentials. SfExchangeConnection stores an external secret reference,
owner/vault relationship, provider and scope-review reference; it defaults disabled.
References must use a recognized external-vault scheme. API credentials are resolved
only server-side through an approved injected secret-manager resolver, with matching
tenant ownership and secret namespace/IAM enforcement. There is no public credential-
submission or secret-reference provisioning endpoint. No external vault is provisioned
or configured by this stage. The default application has no secret resolver and exchange
refresh fails closed until an approved binding is implemented.

The Kraken adapter only permits GetApiKeyInfo and Balance. It signs requests using
ephemeral API-secret material from that external resolver, never transmits or persists
the secret, and rechecks actual key permissions before requesting balances. Any trading,
withdrawal or unknown permission is rejected. Nonces are coordinated under a per-connection
DB advisory transaction lock; consumed nonces commit even on a caught provider failure.
Provider errors are sanitized. Exchange balances are labelled exchange-reported, not
blockchain-corroborated. Production vault ACLs, IP allowlists, rotation/revocation,
timeouts, memory handling and incident recovery need independent security review.

## QR/scanner and export safety

The scanner is explicitly user-triggered. Camera frames/images stay in the browser;
no image upload or third-party QR service is used. Camera tracks stop on cancel/unmount.
Browser BarcodeDetector is used when supported with a local jsQR fallback. Supported
payloads are plain public EVM addresses or an address-only ethereum URI with a supported
chain ID. Amounts/payment instructions, URLs, keys and seed phrases are rejected. A scan
does not auto-save or perform a transaction. Users review address/network before saving;
strict checksum validation uses viem on the server. QR generation uses qrcode, not a mock.
Camera permission is scoped to the new wallet page; other platform pages remain denied.
Browser/camera/header behaviour still requires actual browser verification.

CSV is authenticated, account-scoped, no-store and attachment-only. Cells are quoted and
spreadsheet formula prefixes neutralized. QR SVG responses have a restrictive sandbox
CSP and use only a validated, owned tracked address; they are not SF deposit addresses.

## Permanent stage gates

Private-key imports, recovery-phrase imports, signing, transfers, withdrawals, sweeping
and custody are false. No fund-moving endpoint exists and the RPC adapter rejects write
methods. Read-only exchange HTTP POSTs are API queries, not trades or withdrawals.
Live Stripe charging and separate SF Crypto Payments are not changed by this module.
Future custody/fund movement needs a separate design, independent security/regulatory
review and explicit owner authorisation; nothing here is an activation mechanism.

## Verification and remaining work

Unit tests use explicit provider/repository fixtures; no real chain or exchange balance
has been corroborated in this executor. Dependency-backed EIP-55 and QR round-trip tests
are prepared and skip locally while libraries are unavailable; CI/production verification
requires them rather than accepting a skip. The guarded PostgreSQL suite now covers SF
Wallet tenant isolation and metadata-only vault creation but has not executed here.
Full Prisma/TypeScript/Next/browser verification remains blocked by dependency/network
setup. Do not claim a verified operational wallet or financial transaction from fixtures.

Next stage: complete dependency installation and production/type/migration checks; bind
two reviewed read providers per chain and an approved external credential vault; run real
public-address corroboration, failure/reorg/staleness/load, browser/mobile/scanner and
tenant-isolation tests; then extend token coverage/backfill as separately tested stages.
No public deployment, paid service purchase or live financial transaction occurred.

## Protocol references checked

- https://viem.sh/docs/utilities/getAddress
- https://github.com/blockscout/blockscout-api-v2-swagger
- https://docs.kraken.com/api-reference/account-data/get-api-key-info
- https://docs.kraken.com/api-reference/account-data/get-account-balance
- https://docs.kraken.com/exchange/guides/rest/authentication
- https://github.com/soldair/node-qrcode
- https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
