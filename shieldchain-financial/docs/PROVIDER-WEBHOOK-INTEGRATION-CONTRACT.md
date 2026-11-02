# Provider webhook integration contract

This document defines minimum admission requirements for future trusted server-side adapters. It does not implement a provider integration or verify signatures.

## Required processing order

1. Read the raw request body and verify the provider-specific signature using the provider's documented algorithm and secret-management mechanism. Never trust a client-supplied `signatureVerified` value; the server adapter must derive it from successful cryptographic verification.
2. Validate the provider timestamp within a short configured tolerance and validate the event identifier and allowlisted event type.
3. Atomically claim a unique idempotency key scoped to provider + event ID in persistent storage. Unknown database state or duplicate claims must not trigger side effects.
4. Persist the accepted event envelope before state changes, with bounded payload retention and secrets/PII excluded from ordinary logs.
5. Load the target resource from the database on the server, authorize the transition against its current state, and commit the idempotency claim + state change transactionally where supported.
6. Acknowledge according to provider retry semantics. Failed processing must be observable and safely retryable; do not acknowledge unpersisted events as completed.
7. Reconcile provider state independently. Webhooks are notifications, not sole proof of settlement or identity approval.

## Rules

- Do not execute transfers or payouts directly from an untrusted payload.
- Never accept amount, currency, beneficiary, account ownership or settlement status solely from browser input.
- Allowlist event types and state transitions. Unknown types are quarantined for review, not guessed.
- Store minimal event metadata and a payload digest where possible; protect raw payloads with strict access and retention controls if retention is required.
- Add tests for forged signatures, stale timestamps, duplicate delivery, concurrent delivery, unknown event types, invalid state transitions, provider outages and replay after restart.
- Secrets belong in a managed secret store or deployment secret configuration, never source control or logs.

`lib/provider-webhook-policy.mjs` is a pure decision helper. It assumes the adapter has already verified the signature and queried persistent idempotency state; it does neither itself.
