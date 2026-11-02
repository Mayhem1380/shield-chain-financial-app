# Reproducible verification and current blockers

This continues e781312 and the owner-approved-pricing checkpoint. It does not reset or
replace any source. `/workspace/shieldchain` is absent here; its relationship to this
repository cannot be verified. The recovered archive-provenance commits are not known
to descend from GitHub main. Do not merge, force-push or overwrite either source to
reconcile them without the missing original repository/history.

## Runner

`npm run verify:production` runs only when dependencies and a real lockfile exist.
`npm run verify:production -- --install` requests a registry install first. First use
creates the lock through npm; subsequent use enforces `npm ci`. Install lifecycle scripts
are disabled; official Prisma generation is an explicit stage. Never fabricate a lockfile.
The scoped permission required here is network access for that command's npm/Prisma
downloads through the configured proxy. No deployment, purchase, real payment or GitHub
write is performed by the runner. No broad filesystem permission is needed.

It validates Prisma, generates the client and initial SQL, runs tests/static checks,
the production dependency advisory audit, TypeScript, ESLint and a production Next build. It explicitly disables payments and
targets a dummy local validation database for schema/build checks. Generated SQL is not
applied to any local or customer database. Reports/logs go to ignored timestamped
`.verification/` directories. Credential-shaped strings are redacted from logs; no env
dump is produced. Verification limits its own Next build to one CPU and does not touch
other task processes, containers, branches or files.

## Real database checks

The quality-gates workflow now provisions a disposable PostgreSQL 16 service, generates
and applies the schema there, checks for schema drift, and runs
`SHIELDCHAIN_DATABASE_TESTS=1 node tests/database.integration.mjs`.
This suite refuses non-local hosts or a database name other than `shieldchain_validation`.
It tests real uniqueness, rollback, advisory-lock replay deduplication and DB-backed
session revocation using isolated fixtures. It cleans only fixture-owned records. It is
skipped unless explicitly enabled; a skip is not a pass. No CI or DB execution has been
verified merely by writing this configuration. The generated initial schema validates a
fresh database, not an upgrade of an unknown deployed database. Baseline/migration review
against the restored original DB remains necessary before any real migration.

## Merchant checks and activation

`node scripts/payment-readiness.mjs` reports only non-secret configuration presence,
approved pricing, missing activation and unverified eligibility/payment evidence.
`--provider` optionally performs a GET of the connected Stripe account using securely
injected configuration; it never creates a product, payment or subscription. Account
charges_enabled alone does not prove Premium product acceptance. Written/provider
evidence of exact-product eligibility remains required. No credential values are printed.
No actual Stripe check or genuine authorised transaction has been verified here.

## GitHub backup

The existing repository is Mayhem1380/shield-chain-financial-app. GitHub read access
works, but installation enumeration returns no accessible installations and the prior
branch write returned 403. User admin/push rights do not establish the integration's
Contents write or Pull requests write grants. Do not repeatedly retry the denied write.
After grants are confirmed, back up on a new branch without force and preserve all
existing remote files. Keep independent archive history distinct until the original
repository relationship is resolved. Verified local bundles remain the current backup.

## Current observed setup

Npm attempts in the ordinary sandbox fail with EPERM on the configured proxy connection.
Earlier scoped network requests were interrupted before execution; no successful install
or lockfile is claimed. TypeScript/Next/Prisma are absent. The Docker client exists but
the daemon socket is blocked; local PostgreSQL is not installed. No database, identity,
Stripe credential or outbound identity binding is reported ready by the environment.
The Wallet Aggregator source is missing; its new boundary remains disabled. No public
deployment, spending, activation or genuine financial transaction is authorised by
owner pricing approval.

The production identity adapter and real MFA/session issuance are still unconfigured.
The existing account page remains a disclosed preview, not a working sign-in. This stage
tests DB-backed session boundaries when an isolated DB is available; it does not claim
to have completed identity-provider onboarding or authenticated production customer flows.
