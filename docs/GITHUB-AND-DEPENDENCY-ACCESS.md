# Build access recovery

## Observed state

The cloud runtime reports unrestricted/enforced HTTP policy but the command sandbox has restricted networking. npm ping failed connect EPERM to the inherited managed proxy (172.31.2.125:8080) before reaching registry.npmjs.org. Previous command-scoped network installation requests were aborted during permission handling; no successful install, generated package-lock.json, running npm process or dependency tree has been observed. Do not repeatedly retry or bypass the proxy, remove TLS checks, request root access, or fabricate package resolution.

Required narrow action: approve the command-level network request for npm run verify:production -- --install in /workspace/shieldchain-working. It uses the managed proxy and existing TLS trust. npm needs registry.npmjs.org/package tarball access; Prisma may need binaries.prisma.sh. The current tool can grant network for a command, not express host restrictions in that argument; retain host restrictions in the managed environment policy where supported. No broader filesystem, financial, deployment or spending permission is needed. The first successful install generates the missing lockfile using --ignore-scripts; review the lockfile and dependency audit, then use npm ci for subsequent installations. Prisma generate is an explicit later verification step. No locked installation is possible before the lockfile exists.

After approved installation: run the verification runner, inspect all stage logs, validate/generate Prisma, review generated schema SQL, apply only to the disposable shieldchain_validation database using the documented PostgreSQL CI/runbook, run integration tests, lint, TypeScript, build and browser checks. The runner itself never applies a production migration or enables charging.

## GitHub repository-scoped access

Target: https://github.com/Mayhem1380/shield-chain-financial-app

The connected GitHub tool currently returns installations=[] (allow_all_repositories_for_testing=false). Local checkout has no configured remote/authenticated CLI write identity. Earlier branch creation returned 403 Resource not accessible by integration. These facts establish unavailable installation write access here; they do not identify whether the owner has an unselected app, a different connected GitHub identity, an unapproved permission update or an organization restriction. No new denied write should be attempted until the installation inventory changes.

Repository owner steps:

1. Open GitHub Settings → Applications → Installed GitHub Apps (https://github.com/settings/installations). Find the application used by the Codex/GitHub connection and choose Configure. If absent, connect/install it through the ChatGPT/Codex GitHub setup using the account that owns Mayhem1380/shield-chain-financial-app.
2. Under repository access choose Only select repositories and include shield-chain-financial-app. Save. If an organization owns the repository, an authorized organization owner must approve applicable installation/SSO/third-party restrictions. The observed URL is under Mayhem1380; organization restrictions have not been established as the cause.
3. The app needs Contents read/write to create/push a branch, Pull requests read/write to create a PR, and Workflows write when updating .github/workflows. GitHub App permission levels are declared by the app developer; the repository owner cannot arbitrarily add a permission the app does not request. Accept a pending permission update if one exists. If the app cannot request the required permission, use an approved GitHub integration that can, or a separately provisioned repository-scoped managed credential. Do not send credentials in chat.
4. Refresh/reconnect the GitHub connection and reopen this repository in Codex if required. This task must then verify a nonempty installation containing the intended repo and inspect actual authorization before one safe write attempt. Read-only collaborator status is insufficient evidence of app token Contents write.
5. Restore/verify the local bundle if switching environments. Check remote main and ancestry before pushing a new development branch. Recovered history is independent archive provenance and must not be force-pushed over main. Never overwrite an unrelated existing branch. Inspect a comparison and resolve integration explicitly; no merge or remote push is claimed here.

Previously verified recovery package remains unchanged. New completed stages are preserved in additional bundles/checkpoints, not by overwriting the originals.
