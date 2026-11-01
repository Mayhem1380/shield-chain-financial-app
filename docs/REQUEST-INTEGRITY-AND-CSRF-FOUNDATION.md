# Request integrity and CSRF foundation

This is a pure policy decision helper. It is not wired into Next.js middleware or API routes, does not authenticate a user, and does not create CSRF tokens. Do not describe it as live protection until reviewed and integrated.

## Unsafe request requirements

- Allowlisted exact `Origin` match (production origins must use HTTPS).
- Reject cross-site unsafe requests when Fetch Metadata is available.
- JSON content type only for this API contract.
- Valid CSRF cookie and header tokens that match; compare using constant-time equality after length validation.
- Safe methods (`GET`, `HEAD`, `OPTIONS`) must never mutate server state.

## Integration checklist

1. Define the canonical production origins from deployment configuration; do not derive them from the incoming `Host` header.
2. Generate unpredictable CSRF tokens using a cryptographically secure random generator. Use a host-only cookie, `Secure` in production, `SameSite=Lax` or stricter where compatible, and `HttpOnly` according to the chosen double-submit design. Never put tokens in URLs or logs.
3. Apply this check to every unsafe browser-facing route before parsing or mutating state. Add server-side authorization independently; CSRF is not authentication or authorization.
4. Use a synchronizer-token design or a signed, session-bound double-submit design if subdomain threats are in scope. Plain matching cookie/header values alone are not a complete design against every cookie-injection threat.
5. Add integration tests for reverse proxies, preview deployments, same-site sibling domains, missing Origin, form content types, and all state-changing routes.
6. Keep webhooks on a separate signature/timestamp/idempotency contract; do not apply browser CSRF rules to provider callbacks.

## Security limits

The helper accepts the allowlist as input and cannot prove it is trustworthy. It must be populated only from server-controlled configuration. It cannot detect a safe HTTP method that incorrectly performs a mutation. Production rollout requires code review, route inventory and runtime tests.
