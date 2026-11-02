# Database-backed session management stage

This extends the recovered opaque-session contract without inventing sign-in, an MFA
provider or password handling. The identity provider, credential issuance, recovery and
onboarding flow remain unconfigured. The account page remains a disclosed preview.
No public credential-issuance endpoint has been added. Future identity integration must
use a reviewed provider SDK and verified identity/MFA claims before writing AuthSession.

Implemented endpoints for legitimately issued database sessions:

Customer controls are at `/account/sessions`; they show only real API results and never
create demo sessions. Identity/provider setup is still required to use these controls.

- GET `/api/auth/session`: current verified account/session status, without token/hash.
- GET `/api/auth/sessions`: up to 50 own active sessions, marking the current one.
- POST `/api/auth/logout`: transactional revocation and audit of the presented session,
  then expiration of the Secure/HttpOnly/SameSite=Strict host cookie.
- POST `/api/auth/sessions/revoke-all`: own-session revocation with fresh MFA and audit.

Mutations require an exact configured HTTPS AUTH_ORIGIN (PAYMENTS_ORIGIN is a fallback)
and JSON content type. They do not depend on Stripe charging being enabled. Owner scope
comes from the hashed opaque cookie and database relation; client-supplied IDs/roles are
ignored. Duplicate/invalid cookies, expired/revoked sessions, restricted/unverified users
and stale/future/invalid MFA evidence fail closed. Billing now uses the same session and
MFA checks. Read and revoke-all rate-limit buckets are separate.

For valid-origin logout during a DB outage, the browser cookie is expired but HTTP 503
does not assert server-side revocation. Cross-origin requests cannot clear the cookie.
The provider's own SSO session is not claimed revoked; that needs the selected provider's
reviewed logout integration. Anonymous upstream abuse controls, real provider onboarding,
browser flows and production DB validation remain required before release.

Tests cover ownership, duplicates, revocation, audit rollback, MFA, origin/content type
and outage responses using repository fixtures. The guarded PostgreSQL suite also now
exercises logout revocation, but has not run in this executor. Do not present fixtures or
skipped DB checks as verified production authentication.

The billing summary also now retrieves its exact current invoice when late historical
invoices have pushed it beyond the displayed history page. This fixes a false-negative
access display without changing payment confirmation or allowing foreign invoice access.
