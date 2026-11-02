# Existing Replit Wallet Aggregator — integration boundary

The owner's app source has not been supplied or inspected in this executor. No features,
API routes, balances, custody model, chain support, authentication scheme or provider
permissions are asserted. Existing wallet source and all recovered previews are unchanged.
This stage adds a separate server-side seam, not a replacement wallet application.

`lib/integrations/wallet-aggregator.mjs` defaults to unconfigured/source-uninspected with
no enabled capabilities and transactions disabled. After source review, a trusted server
composition can supply the source revision/review evidence, reviewed read-only capability
names and response fields, an audited adapter, server-owned identity mapping and an audit
sink. Client-supplied subject identifiers are never passed to the adapter. Unknown/write
operations, expired/uninspected reviews, unverified ownership, oversized/deep responses
and secret-shaped response fields fail closed. Provider error messages and response
payloads are not logged by this boundary.

These declarations are contracts, not cryptographic proof of a source inspection or
provider credential scope. An adapter must enforce real provider read-only permissions,
ownership, response byte limits, timeout/abort and network destination restrictions;
the generic seam cannot inspect or constrain an adapter's internal network implementation.
No adapter, endpoint, connection or real credential is configured yet. Tests use protocol
fixtures and do not describe features of the existing Replit app.

Required source-review intake: repository/local source path, pinned revision, architecture,
actual route/capability inventory, identity/session ownership checks, provider scope and
credential storage, chain/network handling, tenancy isolation and tests. Do not send seed
phrases, private keys or payment secrets. Only after inspection map the real, verified
read capabilities and decide whether any further work is needed. Transactions, signing,
custody, deposits and withdrawals require a separate reviewed design and authorisation.
SF Crypto Payments and Stripe Premium billing remain separate.
