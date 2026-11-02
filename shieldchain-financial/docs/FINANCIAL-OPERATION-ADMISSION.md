# Financial operation admission contract

## Scope
This is a pure policy foundation for future exchange, payment, wallet and payout adapters. It does not execute orders, calculate a price, reserve balances, write a ledger, move funds, or establish provider connectivity. Live capabilities remain disabled by default.

## Admission requirements
- The server has independently authorized the user and loaded an active account.
- A suitable step-up verification has succeeded for the operation's risk level.
- A high-entropy idempotency key is validated and its state is checked using a database-backed unique constraint and atomic claim.
- Currency and decimal amount formats are allowlisted; amounts stay as decimal strings, never binary floating-point values.
- The customer has reviewed the applicable quote and required risk checks have passed.

## Required server transaction boundary
Before a real state change, a trusted adapter must atomically claim the idempotency key, reload the account, enforce balance and limits, apply a valid state transition, persist an immutable ledger entry and audit event, and commit the whole database transaction. Provider calls require a separate outbox/reconciliation design; do not hold a database transaction open while calling an external service. Retries must return the original operation outcome rather than duplicate it.

## Fail-closed behaviour
Missing, stale, conflicting or unknown authorization, account, risk, quote, idempotency or state data must deny the operation. A client-supplied flag is never a substitute for server-side evidence. Live capability flags are not to be enabled until provider sandbox tests, reconciliation, security review, operational ownership, legal/compliance approval and release gates have all passed.

## Tests and limitations
The unit tests cover request admission and required state-change prerequisites. They do not prove database atomicity, provider correctness, real authorization, financial calculations, regulatory compliance, or production readiness.
