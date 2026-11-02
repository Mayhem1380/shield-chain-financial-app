# Next engineering backlog — prioritized

Status vocabulary: **UI preview** means presentational only; **foundation** means a design/schema exists; **implemented** requires working code and tests; **approved** requires documented owner sign-off. Never equate a UI preview with a working financial service.

## P0 — identity and platform safety
- [x] Document the proposed identity activation and withdrawal-control state models (specification only; not implemented). See `IDENTITY-AND-WITHDRAWAL-CONTROL-PLAN.md`.
- [ ] Select an identity provider after security and jurisdiction review; configure test tenant only.
- [x] Add provider-neutral, unit-tested authentication flow policies for sign-in prerequisites, token expiry/replay decisions, generic recovery responses and attempt-window decisions (foundation only; no provider, persistence, delivery or sessions). See `AUTHENTICATION-FLOW-POLICY.md`.
- [ ] Implement email verification, MFA/passkeys, secure recovery, session rotation/revocation, CSRF/origin checks and persistent distributed rate limits with a trusted identity provider.
- [ ] Enforce server-side authorization for every user, staff and admin route; no client-only role checks.
- [ ] Connect PostgreSQL in a local test environment; generate and review migrations; add seed data that is entirely fictional.
- [ ] Add structured logs with secrets/PII redaction, correlation IDs, audit events, error reporting and health/readiness separation.
- [ ] Add automated tests for authorization, input validation, session expiry/revocation, abuse limits and error handling.

## P1 — support and feedback
- [ ] Add server-side Zod schemas and POST/read APIs only after authentication and privacy policy are ready.
- [ ] Implement ownership checks, opaque public references, status-transition policy, internal-note isolation and audit logging.
- [ ] Add staff roles, MFA, restricted queues and an assignment/escalation process; do not expose internal notes to customers.
- [ ] Add notification delivery via a selected provider, verified templates, retries, suppression and delivery monitoring.
- [ ] Define retention/deletion and subject-request workflows; test access, export and deletion.

## P1 — quote and exchange architecture
- [ ] Compare licensed/contracted providers and obtain written commercial/API terms.
- [ ] Implement provider adapters behind an internal interface, signed webhook verification, replay protection and idempotency.
- [ ] Represent all money and quantities using decimal-safe types; do not use binary floating point for ledger values.
- [ ] Return quotes with source, timestamp, expiry, route, platform/provider/network fees, spread/slippage disclosures and minimum/estimated output.
- [ ] Build transaction state machine, reconciliation, failed/returned transaction handling, limits and incident playbooks before any execution feature.
- [ ] Keep execution routes feature-flagged off until separate legal, operational, security and business approvals.

## P1 — prop challenge simulation
- [ ] Specify a deterministic event-driven simulator with versioned rule sets and explicit timezone/day-boundary behavior.
- [ ] Use immutable event records and reproducible calculations; test duplicate, delayed, out-of-order and concurrent events.
- [ ] Separate simulated equity, real customer money and any future reward obligations at the data-model and UI levels.
- [ ] Publish complete rules and examples; obtain legal review of eligibility, entry fees, advertising and payout structure.

## P2 — customer experience and business validation
- [ ] Usability-test onboarding and demo flows with beginners and experienced users.
- [ ] Add accessibility checks (keyboard, focus, labels, contrast, screen readers) and responsive QA across mobile/tablet/desktop.
- [ ] Test pricing comprehension and measure whether customers understand total cost, risks and what is not available yet.
- [ ] Build a conservative unit-economics model using actual provider quotes, staffing, acquisition, fraud, compliance and support costs.
- [ ] Identify the intended competitor by exact URL before comparing pricing; record access date, product jurisdiction, fees, spreads, withdrawal costs and material caveats.

## Release criteria
No module is considered complete because its screen looks complete. Require tests, operational owner, documented failure handling, privacy/security review, legal approval where relevant, monitoring, rollback plan and explicit release authorization.


## Newly added policy foundations
- [x] Security-event envelope/redaction policy with unit tests; production append-only sink, retention and alerting remain outstanding.
- [x] Support-ticket intake/queue/status/message visibility policy with unit tests; database-backed authorization, persistence and customer/staff APIs remain outstanding.
- [x] Retention decision helper with legal-hold and restricted-class review gates; approved periods and deletion jobs remain outstanding.
- [x] Draft incident-response playbook and evidence-based production integration gate.


## Latest completed policy batch
- [x] Provider webhook admission contract: signature-verification prerequisite, timestamp window, event allowlist and idempotency state checks. Actual provider cryptography, atomic database claims and event persistence remain unimplemented.
- [x] Release gate and live-capability policy helper with explicit prerequisites and production change-window approval.
- [x] Unit tests and static regression checks for both foundations.

## Next executable milestones
1. Establish and review a real `package-lock.json`; only then change CI installation to `npm ci`.
2. Run dependency install, Prisma validation/generation, TypeScript, ESLint and production build in a network-enabled CI runner.
3. Choose an identity provider and PostgreSQL hosting/provider, configure sandbox-only credentials outside source control, and implement server-side adapters.
4. Add database migrations and integration tests for unique webhook idempotency claims, transactional state changes, session revocation and audit event persistence.
5. Complete independent security/legal review and operational evidence before any live capability or public production deployment.


## Backup and disaster recovery policy foundation

Added a pure fail-closed policy for backup freshness, encryption, restore testing, integrity verification, key recovery and ownership, plus approval checks for controlled restores. This is a decision helper only; provider backup configuration and real restore drills remain outstanding.
