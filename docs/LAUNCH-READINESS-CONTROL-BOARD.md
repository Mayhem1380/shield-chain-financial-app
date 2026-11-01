# Launch Readiness Control Board

## Purpose

This board gives the SF project one visible, honest summary of release gates. It is a planning artifact, not an automated production approval or regulatory certification.

## Current gates

1. **Dependency reproducibility — blocked:** no verified `package-lock.json`; dependency registry timed out in the previous install attempt. Do not fabricate lockfile entries or silently switch to unreviewed packages.
2. **Build quality — not verified:** install dependencies from the approved registry, review the generated lockfile, then run `npm ci`, Prisma generation/validation, TypeScript, lint, tests and `next build`.
3. **Identity and access — not connected:** integrate a chosen provider only after architecture and data-protection review. Enforce authorization server-side; UI visibility is not access control.
4. **Financial providers — not connected:** require approved contracts, provider sandbox tests, signed webhook verification, idempotency, reconciliation and operational ownership.
5. **Security and recovery — not verified:** secrets management, independent security testing, monitoring, incident exercises and a successful restore drill are release evidence.
6. **Legal and customer readiness — not approved:** obtain advice for the exact services and jurisdictions, approve fee/risk disclosures, support escalation and complaint processes.

## Evidence rule

For every gate, record an accountable owner, evidence link, reviewer, review date, unresolved exceptions and explicit approval. A passing static check does not prove that a third-party integration, production environment or legal obligation is ready.

## Non-negotiable safety gate

Keep live trading, deposits, withdrawals, custody, payments and payouts disabled until their separate provider, security, legal/compliance and operations gates have been approved. Do not imply licensing, insurance, audits, guaranteed returns or live capability without current evidence.

## Release sequence

1. Restore reliable package-registry access.
2. Generate and review the lockfile; commit it and use `npm ci` in CI.
3. Run full build and type checks, fix issues, and attach CI evidence.
4. Integrate authentication and database migrations in a non-production environment.
5. Complete provider sandbox and security/recovery exercises.
6. Obtain legal/compliance and operational sign-off for each intended service.
7. Enable capabilities incrementally with monitoring, rollback and incident ownership.
