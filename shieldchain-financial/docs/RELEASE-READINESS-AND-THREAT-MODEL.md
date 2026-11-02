# Release readiness and threat model

**Status: planning and engineering guardrails only. This document is not a security audit or approval to launch.**

## Scope and trust boundaries

The current application is a local product-design scaffold. The browser is untrusted. No identity provider, database, payment processor, custody provider, exchange liquidity provider, email sender, or production monitoring service is connected. All user-entered values and client-side state must be treated as untrusted. A future deployment must separate public content, authenticated customer functions, privileged staff operations, and provider integrations.

## Assets to protect

- Customer identity and contact information, including verification status.
- Authentication credentials, session tokens, recovery links, and MFA/passkey material.
- Account balances and transaction/withdrawal instructions if such capabilities are ever approved.
- Staff/admin privileges, provider API credentials, signing keys, database backups, and audit records.
- Availability, accurate fee/risk disclosures, and the integrity of simulated challenge results.

## Principal threats and required controls

| Threat | Required controls before relevant capability is enabled |
| --- | --- |
| Account takeover | Approved identity provider; phishing-resistant MFA/passkeys where supported; short-lived recovery links; session rotation and revocation; anomaly monitoring; rate limits. |
| Cross-account data access | Server-side ownership checks on every read/write; deny-by-default authorization; tests for IDOR/BOLA; no reliance on hidden UI controls. |
| Privilege escalation | Separate customer/staff/admin roles; least privilege; staff MFA; explicit authorization at every server entry point; reviewed admin membership changes. |
| Forged or replayed provider events | Verify signatures against raw request bytes; timestamp/replay window; idempotency keys; event deduplication; reconciliation and alerting. |
| Withdrawal fraud or mistaken payout | Email and KYC eligibility checks; beneficiary/destination risk checks; holds on mismatch; limits; dual control for high-risk cases; immutable review trail; reconciliation and incident playbook. |
| Secret leakage | Secret manager in deployed environments; no secrets in client bundles, source control, logs, screenshots or public artifacts; rotation and access review. |
| Injection and cross-site attacks | Input validation on the server; output encoding; appropriate CSP strategy; CSRF/origin defenses for cookie-authenticated mutations; dependency updates and security testing. |
| Denial of service and automated abuse | Edge/WAF controls, request/body limits, per-route rate limits, bot monitoring, resource budgets and escalation procedures. |
| Sensitive data over-collection | Data minimization, approved retention periods, access logging, deletion/export workflow, vendor review, and no raw identity documents in the application database unless specifically justified and approved. |
| Misleading financial presentation | Clearly mark simulated data; disclose all material fees and risks; source/time/expiry for future quotes; independent review of claims and product rules. |

## Security headers currently configured

`next.config.ts` configures `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`, and `Cross-Origin-Resource-Policy`. HSTS is configured for production mode. These headers are useful baseline controls, not a substitute for authentication, authorization, a carefully designed Content Security Policy, secure cookies, application testing, or infrastructure controls.

A strict Content Security Policy has deliberately not been guessed here: Next.js rendering and any future third-party integrations need to be inventoried first, and a CSP should be tested in report-only mode before enforcement. Do not add broad `unsafe-eval` or wildcard sources simply to silence violations.

## Release gates

### Gate A — safe local engineering
- [ ] Install dependencies from the lockfile and record Node/npm versions.
- [ ] Run static preflight, lint, TypeScript checks, production build and automated tests; preserve actual logs.
- [ ] Review Prisma schema and create migrations against a disposable local PostgreSQL database.
- [ ] Ensure sample/seed data is fictional and no customer data is used.

### Gate B — private, non-financial research beta
- [ ] Confirm the exact data collected, privacy notice, retention/deletion process and support escalation.
- [ ] Add tested authentication, authorization, abuse limits, monitoring, backup/restore and incident response.
- [ ] Use an isolated test environment and synthetic accounts; disable money movement and live execution at provider and server levels.
- [ ] Obtain legal review of beta invitations, terms, privacy, marketing and jurisdictions.

### Gate C — any regulated or money-moving capability
- [ ] Written legal/regulatory advice for each target jurisdiction and product activity.
- [ ] Provider contracts, onboarding, security due diligence, operational ownership and tested sandbox integration.
- [ ] Independent penetration test and remediation of critical/high findings; threat model and data-protection review.
- [ ] Ledger/reconciliation design, transaction limits, idempotency, key management, incident response and customer complaint processes.
- [ ] Documented approvals from business, compliance, security and operations owners.
- [ ] Explicit founder authorization for the specific live capability. No implied approval from general project enthusiasm.

## Static preflight

Run `npm run preflight` to check a small set of required files and ensure key demo disclosures remain present. It is intentionally a lightweight consistency check. It does not execute the application, validate headers in a browser, inspect dependencies, connect a database, or prove security.

## Incident principles

If a suspected compromise or transaction integrity issue occurs: stop affected capability using a tested server-side kill switch, preserve evidence, restrict credentials, notify designated incident owners, assess customer/regulatory notification duties with counsel, reconcile affected records, and communicate factually. Never delete audit evidence or promise that no loss occurred before the investigation establishes the facts.
