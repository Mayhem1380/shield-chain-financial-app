# Reproducible build and CI contract

## Goal

Every merge candidate must install the exact dependency graph reviewed by the project, run the policy and repository checks, validate the Prisma schema, and build the same application artifact. A successful static preflight is not a substitute for a successful framework build.

## Required sequence

1. Resolve dependencies on a trusted network with the supported Node/npm versions and create `package-lock.json` using the project's `package.json`.
2. Review the complete lockfile diff. Confirm package names, versions, integrity hashes, registry sources, and that no unexpected package or install script has appeared. Do not fabricate a lockfile or hand-edit dependency resolutions.
3. Run `npm ci --no-audit --no-fund` from a clean checkout.
4. Run `npm run test:policy`, `npm run preflight`, `npm run db:preflight`, `npm run security:preflight`, `npm run typecheck`, `npm run lint`, `npm run db:generate`, and `npm run build`.
5. Keep CI artifacts and logs free of secrets and customer data. Investigate and fix failures; do not weaken gates just to get a green run.
6. Require an independent review of production configuration, identity-provider integration, threat model, privacy obligations, backups, incident response, and capability flags before deployment.

## Current blocker

The source snapshot does not contain a reviewed npm lockfile and the dependency registry was unreachable during the last attempt. CI is deliberately set to `npm ci`, so it will fail early until a real lockfile has been generated and reviewed. This is safer than silently resolving a different dependency tree on each run. No successful Next.js production build is claimed at this stage.

## Release safety

`/api/health` must continue to report the scaffold as not ready until its actual dependencies are configured and checked. Trading, deposits, payments, custody, swaps, withdrawals and payouts must remain disabled until each capability has a separate, approved integration and release gate. Passing CI alone does not authorize live financial operations.
