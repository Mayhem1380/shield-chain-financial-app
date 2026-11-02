# Persistent customer operations stage

Adds /customer-support, /command-centre, authenticated /api/customer/* and /api/command-centre/* endpoints. Existing support preview and financial features remain intact. These are database-backed workflows, not local mock-success forms. Endpoints fail closed if authentication or database infrastructure is absent.

## Customer workflows

Authenticated users can create idempotent owned tickets, read the latest 100 owned tickets/messages, submit public replies, close/resolve permitted tickets and acknowledge owned in-app notifications. Maximum 20 open tickets per user. Creation/replies/status/notifications are written with audit events in database transactions. Customer detail queries explicitly exclude internal messages. Intake rejects unexpected role/priority/internal fields, obvious secrets and overlong content. Detection is defence in depth; it cannot detect every secret, so the UI warns against sensitive submissions. No attachments, email or push delivery is enabled.

The original policy uses IN_PROGRESS and SECURITY_INCIDENT whereas the original database uses TRIAGED and SECURITY. The adapter maps these explicitly, including exchange/challenge financial queues. Customers cannot advance internal workflow states. Closed tickets remain terminal. Resolved tickets require an authorized staff transition before receiving further replies. The UI/API clearly bound history; complete pagination remains future work.

## Staff and owner roles

PlatformRole is separate from BillingRole. Every user defaults to CUSTOMER. No role-management or role-escalation API exists. Provision staff only through a separately approved operator procedure after identity verification; do not treat the first account, a billing administrator, an email address or browser input as owner authority. Provisioning and identity/MFA enrollment are not implemented by this stage.

All staff requests require recent server-recorded MFA. SUPPORT sees account/wallet/feedback/other queues; SECURITY sees security/account-access; OPERATIONS sees payment/exchange/challenge; OWNER sees all. Internal notes are returned only after category authorization. First response time is set on the first public staff response. No staffing or response-time guarantee is made.

Owner overview exposes record counts and latest 100 audit summaries without raw audit metadata, customer credentials or message bodies. This is an initial Command Centre, not complete administration of mining, lending or AI.

## Emergency controls

Owner + recent MFA can persist only a stop for SUPPORT_WRITES, WALLET_REFRESH or BILLING_CHECKOUT. There is no enable/reset route. Stops are audited atomically. Support mutations check the stop inside their transaction, wallet refresh/exchange endpoints check before starting external reads, and the public checkout endpoint checks before checkout creation. Reconciliation, payment webhooks, cancellation, session revocation, saved wallet reads and support reads remain available. A stop cannot retroactively cancel a request already in progress; it is not a substitute for provider shutdown or incident response. Direct internal checkout helpers are not external entrypoints and retain their existing activation gates. Restoring a service requires a separate reviewed and audited operator procedure; no restoration tooling is supplied.

All new endpoints use shared opaque-session authorization, exact-origin JSON mutation checks, persistent per-user rate limits, bounded request bodies, no-store headers and sanitized failure audits. Session issuance, provider registration and real MFA verification remain external prerequisites. All underlying live financial gates remain unchanged/disabled.

## Validation and remaining gates

15 new unit/service fixture cases pass; all 235 available unit/policy cases and four static preflights pass. A new PostgreSQL suite case exercises actual unique creation, internal-note exclusion, foreign-owner denial and notification acknowledgement, but that suite has not run without Prisma dependencies and a disposable database. No migration has been applied. Prisma generation/validation, TypeScript, Next build, browser accessibility and end-to-end checks remain blocked/unverified.

Dependency permission request was again aborted before installation. No package-lock.json or installed dependency tree is present. No npm process remains. Existing evidence identifies connect EPERM to the managed proxy. Do not treat unrestricted cloud HTTP policy as a command-level network grant, and do not retry denied network operations repeatedly.
