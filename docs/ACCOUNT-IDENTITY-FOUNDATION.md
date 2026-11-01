# Account and identity foundation

## Current implementation status

- `/account` is a responsive visual preview of create-account and sign-in screens.
- The form intentionally does not create users, send email, store submitted addresses, or authenticate anyone.
- The Prisma schema now has provider identity fields and an `AuthSession` model that stores a token digest rather than a raw session token.
- No identity provider, database, email delivery, MFA, passkeys, or session middleware is configured by this starter.

## Required before real accounts

1. Select an established identity provider and confirm the intended jurisdictions and use case.
2. Implement provider-hosted or provider-SDK sign-up/sign-in, email verification, MFA/passkeys, secure account recovery, and session revocation.
3. Create sessions only after successful provider verification. Generate high-entropy opaque session tokens, store only a cryptographic digest, use `HttpOnly`, `Secure`, and appropriate `SameSite` cookies, rotate tokens, and enforce expiry server-side.
4. Normalize and uniquely constrain email addresses consistently; handle provider subject identifiers as opaque values. Never trust client-submitted user IDs, roles, account status, or verification state.
5. Add server-side authorization for every protected page and API route, deny by default, and test privilege boundaries including admin access.
6. Apply rate limits and abuse detection to sign-in, recovery, verification, and MFA endpoints. Avoid revealing whether an email address has an account.
7. Record security-relevant events without logging passwords, raw tokens, recovery codes, or unnecessary personal data. Define retention and access policy for logs.
8. Add tests for expired/revoked sessions, account status restrictions, CSRF where applicable, cookie settings, brute-force protections, and role escalation.
9. Review privacy notices, data retention/deletion, incident response, accessibility, and the provider contract before enabling real users.

## Database notes

`AuthSession.tokenHash` must contain a cryptographic digest of a randomly generated token, never the token itself. `User.identityProvider` and `User.providerSubject` identify the external identity; no local password hash is part of this design. `AuditEvent` is an audit-record shape, not automatically immutable: enforce append-only behavior through database permissions and operational controls.

This document is an engineering checklist, not a security certification or legal opinion.
