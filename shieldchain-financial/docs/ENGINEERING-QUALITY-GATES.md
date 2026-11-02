# Engineering quality gates

## Purpose

The repository now defines a GitHub Actions workflow that runs on pull requests and pushes to `main` or `master`. It installs dependencies, generates the Prisma client, runs the static preflight, TypeScript, ESLint and production-build checks.

A green workflow is useful evidence that the source can pass these automated checks in the workflow environment. It is not a security audit, penetration test, legal review, operational readiness assessment, or permission to enable real financial services.

## Current limitations

- The project does not currently include a committed npm lockfile. The workflow uses `npm install` until a reviewed lockfile can be generated and committed; reproducible dependency installation remains a release requirement.
- This workflow has been added to the repository archive but has not run on GitHub in this workspace. Do not describe the remote workflow as passing until an actual run is available.
- No integration tests currently exercise real database, email, identity-verification, authentication or financial-provider services because those integrations are not configured.
- The static preflight only checks repository consistency and required disclosures.

## Release policy

Before a private beta, require a committed and reviewed lockfile, successful CI runs, database migration review, automated tests for authorization and account boundaries, secret scanning, dependency vulnerability review, backup/restore rehearsal, monitoring and incident-response preparation. Require an independent security review and qualified jurisdiction-specific legal advice before any public financial-service launch.

Never put production secrets, real customer identity documents, wallet keys or payment credentials in the repository or CI logs. Keep live trading, custody, payments, deposits, withdrawals and payouts disabled until each capability has its own approved design, provider, controls, tests and explicit release authorization.
