# Security regression checks and next integration tests

## Implemented in this round

`npm run security:preflight` runs a lightweight static regression suite. It checks that the repository still documents and represents the intended safety boundaries: unique hashed session tokens, expiry and revocation fields, restricted account states, withdrawal identity/risk holds, server-side authorization requirements, visible prototype disclosure, disabled live financial capabilities, and baseline security headers.

These are guardrail checks against accidental repository changes. They are **not** dynamic security tests and do not prove that any control is enforced at runtime.

## Required runtime tests before any customer data or financial capability

1. **Authentication/session:** unauthenticated requests are denied; expired and revoked sessions fail; session tokens are high entropy; raw tokens are never stored; sign-out revokes the session.
2. **Authorization / IDOR:** User A cannot read or mutate User B's account, tickets, challenges, KYC metadata, or withdrawal requests by changing IDs, URLs, request bodies, or API parameters.
3. **Account state:** `PENDING`, `RESTRICTED`, and `CLOSED` accounts cannot perform protected actions; state is checked on the server for every request.
4. **Sensitive action revalidation:** withdrawal approval rechecks verified email, current non-expired KYC, beneficiary match, limits, account state, and risk holds at execution time—not only when the request was first created.
5. **Concurrency/idempotency:** repeated submissions, simultaneous approvals, provider retries, and webhook replays do not create duplicate requests or payouts. Use database transactions and provider idempotency keys.
6. **Staff separation:** support roles cannot approve payouts or grant privileges; privileged actions require MFA, least privilege, and an immutable audit event.
7. **Abuse and privacy:** rate limits, CSRF protections where cookie sessions are used, safe error responses, redacted logs, and no sensitive personal data in public responses.
8. **Recovery:** test backup restoration and incident response in a disposable environment.

## Execution gate

Do not mark the project production-ready until a trusted identity/session integration is implemented, tests run against a disposable database and staging environment, an independent security review is complete, and Australian legal/compliance obligations are reviewed by qualified professionals. Live trading, deposits, custody, withdrawals, payments, and payouts remain disabled meanwhile.
