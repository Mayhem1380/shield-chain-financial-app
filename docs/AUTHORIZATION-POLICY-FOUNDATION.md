# Server-side authorization policy foundation

**Status: isolated policy primitives only. Not connected to sessions, routes, Prisma, or a live identity provider.** This code is not a substitute for authentication middleware or route-level enforcement.

## What this foundation provides

- A deny-by-default permission matrix for customer, support, reviewer, and admin roles.
- Server-context checks for active account status, customer resource ownership, assigned support cases, staff MFA, and optional step-up verification.
- Explicitly prevents the `admin` role from inheriting withdrawal-approval permission.
- Unknown roles, malformed permissions, missing owners/assignments, invalid sessions, and non-active accounts are denied.
- Unit tests for cross-account access, account status, MFA, step-up, staff boundaries, and mutation resistance.

## Required integration contract

1. Resolve the session from a trusted server-side session store; never trust client-provided user IDs, role names, MFA claims, or account status.
2. Load current account status, permission grants, resource owner and case assignment from the database for each protected request (or a documented, short-lived trusted cache with revocation behavior).
3. Call the policy from every protected route handler, server action, background job, and sensitive data read—not only from UI pages.
4. Enforce CSRF protections for cookie-authenticated state-changing requests, rate limits, audit records, and generic client-safe errors.
5. Add integration tests against a real test database and chosen identity provider, including parallel requests, revoked sessions, role changes, IDOR attempts, and staff separation.
6. Keep withdrawal release behind separate risk controls and dual control where required. This policy alone cannot approve or release funds.

## Current non-goals

No password handling, session issuance, token validation, cookie parsing, database lookup, role assignment UI, audit persistence, provider integration, or route protection is implemented here. The app must continue to disclose that authentication is not connected, and live trading, payments, wallets, and withdrawals remain disabled.
