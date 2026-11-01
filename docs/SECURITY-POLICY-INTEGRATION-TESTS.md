# Security policy integration tests

## Purpose

`tests/integration-security-flow.test.mjs` exercises the composition of existing pure policy helpers: request integrity, rate-limit admission, server-resolved authorization, financial-operation admission, and privacy-filtered security-event construction. These are policy-composition tests, not end-to-end tests of Next.js routes or production infrastructure.

## Required request path

1. Resolve the request origin and enforce request-integrity/CSRF policy for unsafe browser mutations.
2. Resolve the authenticated session on the server; never trust identity or role values from request JSON.
3. Derive a rate-limit subject from trusted server-side identity or a server-derived IP hash and query an atomic shared store.
4. Apply explicit authorization and step-up verification for the requested resource/action.
5. For any future financial operation, keep the capability off by default and evaluate all admission checks before an atomic database transaction.
6. Emit a bounded, privacy-filtered security event for relevant denials and operational failures.

A denial at any stage must stop the request. A later stage must never override an earlier denial. For financial requests, rate-limit store failures must fail closed. The in-memory/pure policies do not themselves enforce this sequence on live routes.

## Run

- `npm run test:integration-security`
- `npm run test:policy`
- `npm run security:preflight`

## Production validation still required

- Route-level integration tests with real server middleware and verified session resolution.
- Atomic shared rate-limit storage under concurrency and multi-instance deployment.
- CSRF token issuance/rotation and origin configuration tests.
- Database transaction/idempotency/audit atomicity and reconciliation tests.
- Monitoring delivery, redaction tests, alert ownership and incident exercises.
- Dependency lockfile, full type-check, lint, Prisma validation and production build.

No live trading, payments, custody, wallets, deposits, withdrawals or payouts are enabled by these tests.
