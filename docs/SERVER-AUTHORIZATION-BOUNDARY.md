# Server authorization boundary foundation

`lib/server-authorization-boundary.mjs` is a provider-neutral fail-closed helper for future server route handlers. It combines a caller-supplied trusted session resolver, server-loaded resource ownership/assignment, and `lib/access-policy.mjs`.

## Safety properties
- Missing identity-provider integration returns `503 IDENTITY_PROVIDER_NOT_CONFIGURED` rather than allowing access.
- Client-controlled headers or JSON are not treated as a principal; the caller must resolve a session with a trusted server-side verifier.
- Session resolution failures and resource/database failures deny access.
- Resource ownership must be loaded server-side; a caller must not accept owner IDs supplied by the browser.
- The result exposes only the user ID and role needed by the next server layer, not a raw session/token.
- Staff MFA and step-up checks remain governed by the authorization policy.

## Important limitations
This is not authentication by itself. It does not parse cookies, validate cryptographic tokens, implement CSRF protection, create/revoke sessions, or protect any route until a route handler actually calls it. It is not connected to Prisma or an identity provider. Route integration must use the provider's official server SDK, secure cookie settings, CSRF/origin protections for state-changing requests, rate limits, audit events, and database-backed ownership checks. Add integration tests for every protected route before beta access.

No financial actions are enabled by this helper. Real trading, deposits, custody, payments, withdrawals and payouts remain disabled.
