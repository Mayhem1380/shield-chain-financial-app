# Authentication and authorization implementation plan

**Status: design contract only — no production authentication is implemented.** The account page remains a preview and the application must not accept real customer credentials, identity documents, deposits, trades, withdrawals or payouts until this plan is implemented and independently reviewed.

## Security boundary

Authentication establishes who is making a request. Authorization determines what that identity may do to a specific resource. Both checks belong on the server for every protected page, route handler, server action and background job. Hiding a button or checking a role in browser code is not authorization.

## Required request pipeline

1. Validate input shape and size; reject unexpected fields.
2. Resolve the session from a high-entropy opaque cookie using a constant-time-safe digest lookup where supported. Never accept a user ID or role supplied by the browser as proof of identity.
3. Reject missing, expired, revoked or otherwise invalid sessions.
4. Load current account status from the database. Deny access for `PENDING`, `RESTRICTED` and `CLOSED` unless a narrowly defined, audited recovery/review action explicitly permits it.
5. Check the required permission and resource ownership on the server. Apply least privilege and deny by default.
6. Require step-up authentication and/or fresh identity/risk checks for sensitive actions, according to the approved risk policy.
7. Perform the state change transactionally, use idempotency protection for retryable financial workflows, and write an audit event without secrets or unnecessary personal information.
8. Return a generic client-safe error; do not leak whether an account/email exists or disclose internal risk signals.

## Session requirements

- Use a vetted identity provider / authentication library; do not create a home-grown password system.
- Cookie settings: `HttpOnly`, `Secure` in production, `SameSite=Lax` or stricter where compatible, narrow path, no broad domain unless required.
- Rotate session tokens after sign-in, privilege changes and step-up authentication; revoke on sign-out, account restriction, credential recovery and suspected compromise.
- Enforce absolute and idle expiry on the server. `lastSeenAt` is not itself an expiry policy.
- Store only a digest of a cryptographically random token. Never log tokens, authorization headers, secrets or full session cookies.
- Add CSRF protection for state-changing cookie-authenticated requests; validate `Origin` where appropriate.
- Require MFA for staff/admin accounts and for high-risk user actions; use phishing-resistant methods for privileged staff where feasible.

## Minimum authorization matrix

| Capability | Anonymous | Active customer | Support staff | Security/finance reviewer | Admin |
|---|---|---|---|---|---|
| Public education and marketing | Allow | Allow | Allow | Allow | Allow |
| Read own account / own tickets | Deny | Own records only | Only assigned/authorized cases | Only when assigned/authorized | Only when needed and audited |
| Read another customer's records | Deny | Deny | Minimum case scope | Minimum review scope | Explicit permission, audited |
| Change account status / staff roles | Deny | Deny | Deny | Deny unless specifically delegated | Dual control for sensitive changes |
| Approve or release withdrawals | Deny | Deny | Deny | Dedicated permission, dual control for higher risk | Not implicit from admin role |
| View raw identity documents | Deny | Provider-hosted flow only | Deny by default | Provider-hosted flow; minimum necessary | Deny by default |
| Enable live trading/payments/custody | Deny | Deny in current scaffold | Deny | Deny | Remains disabled until separate release approval |

## Sensitive workflow invariants

- `ACTIVE` status and verified email are necessary but not sufficient for a financial action.
- KYC must be current and approved for the applicable product, jurisdiction and risk tier.
- A withdrawal must re-check account status, identity state, beneficiary/name match, asset/network/destination, limits, holds, fraud flags and available balance on the server at decision time.
- Mismatches, stale verification, provider outage, duplicate/idempotency conflict, unresolved risk flags or missing audit storage must fail closed and route to review.
- Customer-facing status and staff review decisions must be auditable. Do not store raw identity documents, biometrics, private keys or provider secrets in this app database.
- Support agents must not be able to approve withdrawals or elevate their own permissions.

## Required automated tests before integration approval

1. Anonymous requests cannot access protected pages, route handlers or server actions.
2. A forged client-supplied user ID/role cannot change the resolved identity or permissions.
3. Expired, revoked and malformed sessions are rejected; revoked sessions stop working immediately or within a documented bounded cache window.
4. `PENDING`, `RESTRICTED` and `CLOSED` users cannot perform protected actions.
5. User A cannot read or mutate User B's account, tickets, KYC metadata, challenges or withdrawal requests (IDOR tests).
6. Staff role boundaries and support-ticket internal-message visibility are enforced server-side.
7. CSRF, rate-limit, brute-force and session-fixation controls are tested.
8. Sensitive operations require the expected step-up checks, produce audit events, and are safe under concurrent/retried requests.
9. Withdrawal checks fail closed for beneficiary mismatch, stale KYC, provider timeout, account hold and missing audit persistence.
10. Secrets and sensitive fields never appear in logs, client bundles, error responses or health endpoints.

## Release gate

Do not enable customer sign-up or any live financial capability until the chosen provider integrations, migrations, environment/secret handling, abuse controls, privacy retention, incident response, independent security review, legal/regulatory assessment and end-to-end tests are complete. The Prisma models are only data-model scaffolding; they do not implement these controls by themselves.
