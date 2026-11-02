# SF database and migration readiness

## Current boundary

The Prisma schema is a design foundation. A static schema preflight is now part of the local checks and CI workflow, but it does not connect to PostgreSQL, prove Prisma can generate a client, validate migrations, or establish that the data model is production-ready. No live customer data or real financial activity should use this schema until the gates below are complete.

## Current schema review points

- **Identity provider mapping:** `User.email` is unique and provider identity is represented separately. Confirm the chosen identity provider's stable subject semantics and account-linking rules before implementation. Do not link accounts based only on an unverified email.
- **Session storage:** `AuthSession` stores a token digest rather than the bearer token. The future adapter must generate high-entropy tokens, hash them with a documented algorithm, enforce expiry and revocation on every protected request, and never log raw tokens.
- **Account state:** `PENDING`, `ACTIVE`, `RESTRICTED`, and `CLOSED` are policy inputs, not self-enforcing permissions. Every protected server operation must check current status and permission.
- **Audit history:** the schema comment describes an append-only intention; it is not a database guarantee. Production should use a restricted database role, deny ordinary application updates/deletes to audit rows, and consider export to a separately controlled immutable log service. Never put secrets, identity documents, full payment details, or raw session tokens in metadata.
- **KYC data minimisation:** keep document images and biometric material with an approved provider. Persist only the minimum provider reference, status, verification results, and retention metadata needed for an approved purpose.
- **Withdrawals:** money-like quantities use fixed-precision Decimal, unresolved beneficiary checks remain nullable, and hold reasons are represented. These fields alone do not implement a safe withdrawal workflow. State changes need a server-side transition policy, transaction boundaries, idempotency keys, independent approval where appropriate, provider reconciliation, and immutable audit events.
- **Support messages:** `authorType` and `internal` are not access controls. Enforce allowed author types and prevent customers from reading internal notes at the query/service layer. Apply strict per-ticket authorization to every read and write.
- **Retention and deletion:** establish approved retention, correction, export, deletion, and legal-hold rules with privacy counsel before storing personal data.

## Required database release gates

1. Choose and provision a supported PostgreSQL service in a non-production environment.
2. Add a reviewed dependency lockfile and install from it in CI; do not claim reproducible builds until this is in place.
3. Run `npx prisma validate` with a valid non-production `DATABASE_URL` configuration and `npm run db:generate` using installed, reviewed dependencies.
4. Create migrations from the reviewed schema; inspect SQL for destructive changes, indexes, foreign keys, uniqueness, lock duration, and backfill strategy.
5. Apply migrations to an empty disposable database and to a representative staging snapshot; verify rollback or documented forward-fix procedures.
6. Add integration tests for account linking, session expiry/revocation, restricted accounts, cross-user access attempts, internal support notes, duplicate withdrawal requests, invalid state transitions, and audit-log permissions.
7. Test backups and restore, point-in-time recovery, least-privilege roles, encryption, monitoring, alerting, and incident response.
8. Obtain security, privacy, operational, and jurisdiction-specific legal approval before production data or financial activity.

## Migration operating rules

- Never run `prisma migrate dev` against production.
- Use reviewed migration files and a controlled deployment process for staging/production.
- Take and verify a restorable backup before a risky migration; rehearse restore before launch.
- Prefer expand-and-contract migrations for changes that must coexist with old and new application versions.
- Do not silently rewrite migration history after it has been applied to a shared environment.
- Keep credentials out of source control, build logs, screenshots, and support tickets.
- Financial actions must fail closed if the database, identity provider, risk policy, or audit write required for the action is unavailable.

## Dependency reproducibility status

A lockfile-only npm install was attempted during this round but timed out in the available environment. No lockfile is being fabricated by hand. Until a lockfile is generated from a successful dependency resolution, CI uses `npm install` and installs are not fully reproducible. Once a lockfile is reviewed and committed, change CI to `npm ci` and enable npm caching against that lockfile.
