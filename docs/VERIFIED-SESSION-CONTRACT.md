# Verified session contract

## Purpose

`lib/verified-session-contract.mjs` defines the narrow, normalized claim shape SF expects from a trusted server-side identity-provider adapter. It rejects incomplete sessions, unverified email, unknown roles/statuses, missing MFA state, invalid expiry, and expired sessions. It returns only allow-listed fields so provider tokens and unrelated claims are not forwarded to downstream policy code.

## Important boundary

This module **does not authenticate anyone**. It does not parse cookies, validate a JWT signature, query a provider, check session revocation in a database, or protect a route on its own. Only call it after a trusted server-side adapter has cryptographically/provider-verified the session and checked revocation. Never construct its input from request JSON or client-supplied identity headers. The `now` option exists for deterministic tests; production callers should use the server clock.

## Required adapter behavior before integration

1. Use a maintained identity provider / SDK and its documented server-side session verification method.
2. Resolve the session from secure, HttpOnly, Secure, appropriately SameSite cookies or an equivalent provider-approved mechanism.
3. Check revocation, expiry, issuer/audience where relevant, account status, and verified email from trusted records.
4. Map provider roles to SF's allow-list on the server; never accept a role from the browser.
5. Supply MFA status only from provider-verified claims/session state. Sensitive actions need fresh step-up verification.
6. Use the normalized result with `authorizeServerOperation`, and load ownership/assignment from the database on the server.
7. Add integration tests for logout/revocation, expiry, account restriction, CSRF, cross-account access, provider outage, and concurrent requests.

## Current status

This is a tested contract only. No identity provider is selected or connected; no production sign-in is implemented. Live trading, payments, custody, wallets, withdrawals and payouts remain disabled. A passing unit test is not a security audit or launch approval.
