# Build Readiness Report

Run `npm run build:readiness` before attempting the full application build. The command prints a machine-readable JSON report and does not install packages, access the network, expose environment values, or change project files.

## Interpreting the result

- `blocked`: one or more prerequisites are absent. Do not treat the application as build-verified.
- `review-required`: prerequisites exist but a manual review is outstanding.
- `ready-for-validation`: environment prerequisites are present; this is not evidence that build, type-check, lint, Prisma validation, or runtime tests pass.

The report checks the Node major version, lockfile presence, installed dependency directory, `.env.example`, required npm scripts, and whether a local `.env` exists. It intentionally reports only the presence of `.env`, never its contents.

## Current known limitation

The project has no reviewed `package-lock.json` and the dependency registry was unreachable in the latest build attempt. Until dependency resolution works, do not use `npm ci`, claim a reproducible install, or claim a successful production build. Retry from a trusted network, inspect the lockfile diff, then run `npm ci`, `npm run typecheck`, `npm run lint`, Prisma validation/generation, and `npm run build`.

Do not enable deposits, trading, custody, swaps, payments, withdrawals, or payouts based solely on this report.
