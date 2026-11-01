# Authentication flow policy foundation

## Scope

`lib/auth-flow-policy.mjs` is a provider-neutral policy layer for future sign-in, email-verification, password-reset, and attempt-rate-limit flows. It is intentionally not an authentication implementation. It does not verify passwords, validate signed tokens, send messages, write a database, create sessions, or atomically consume a token.

## Required integration rules

- Delegate password storage, credential verification, MFA challenges, secure recovery delivery, and session lifecycle to a trusted identity provider where possible.
- Never log passwords, raw reset tokens, session cookies, MFA codes, or full identity documents.
- Generate high-entropy, single-purpose verification/reset tokens using a cryptographically secure random generator. Store only a strong cryptographic hash, use short expiries, and consume them atomically in the database.
- Use a generic password-reset response so the endpoint does not disclose whether an email address exists. Apply per-account and per-IP throttling, abuse monitoring, and appropriate bot controls.
- Persist failed-attempt counters and rate-limit state server-side with atomic updates; the included pure helper is not a distributed rate limiter and can be bypassed if not connected to persistence.
- Re-check account status and email verification before creating a session. Require MFA for staff and step-up verification for sensitive actions.
- Use secure, HttpOnly, SameSite cookies; protect state-changing requests against CSRF; rotate sessions after authentication or privilege changes; support revocation and short idle/absolute expiry.
- Do not reveal whether a username/email exists through different error messages, response codes, or materially different response timing.
- Test concurrency, replay, enumeration, lockout bypass, session fixation, recovery abuse, and account takeover paths in a staging environment.

## Release gate

This policy is not connected to an identity provider, database, account route, or email service. Do not use it as the sole security control. Real account access remains disabled until the trusted provider is configured, integration tests pass, and security/compliance reviews are complete.
