# Release gates and live capability flags

The release-gate helpers are policy checks, not deployment automation. A positive policy result is not legal advice, security certification, provider approval or proof of operational readiness.

## Release checklist

All required gates must be explicitly true: identity provider configured; migrations reviewed; backup/restore tested; independent security review complete; incident owner assigned; support process ready; legal/regulatory review complete; monitoring/alerting ready; rollback tested; and explicit release approval recorded. Production also requires an approved change window.

## Financial capability checklist

Trading, payments, wallets and withdrawals remain disabled by default in the current scaffold. Before any activation, the release gate, provider approval, server-side authorization tests, reconciliation, fraud/abuse controls, customer disclosures and operational ownership must all be independently verified and recorded.

## Evidence expected

- CI run tied to a commit SHA and reviewed dependency lockfile.
- Successful typecheck, lint, build, unit, integration and migration tests.
- Threat model and independent penetration/security assessment with findings closed or formally accepted.
- Backup restore evidence, monitoring alerts, incident contacts and rollback drill.
- Jurisdiction-specific legal advice and approved customer terms/disclosures.
- Provider sandbox and reconciliation test evidence, plus explicit approval for any live capability.

No checklist value should be marked true merely because documentation exists. The evidence must exist and be reviewed by the accountable owner.
