# Withdrawal policy foundation

**Status: isolated policy code and unit tests only. Not connected to the app, database, identity/KYC providers, balances, custody, banks, payment rails or transaction execution.**

`lib/withdrawal-policy.mjs` provides two small, side-effect-free primitives for future server-side implementation:

- `evaluateWithdrawalApproval(input, { now })` returns an allow/deny decision and reason codes. Every required boolean must be literally `true`; missing, unknown or false checks block. It validates a positive decimal amount string without converting it to a floating-point number, validates the asset-code format, and requires a valid future KYC expiry.
- `canTransitionWithdrawal(from, to)` checks an explicit status-transition graph. It blocks skipping straight from request to payment and reopening terminal states.

These helpers are not authorization by themselves. A future server route must obtain every input from trusted server-side records and verified provider responses, authenticate and authorize the actor, re-check balance/limits/holds atomically, persist state changes and audit events transactionally, protect against replay/concurrency, and keep any execution adapter disabled until separately approved. Never accept client-supplied booleans as evidence of identity, KYC, beneficiary match, risk clearance or available balance.

## Run the focused tests

```sh
npm run test:policy
npm run preflight
npm run db:preflight
npm run security:preflight
```

The unit tests exercise only the pure JavaScript policy functions. They do not prove database transaction safety, provider integration, authentication, legal compliance, operational readiness or production security.
