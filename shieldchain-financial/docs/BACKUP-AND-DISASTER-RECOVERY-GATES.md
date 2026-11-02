# Backup and Disaster Recovery Gates

This document defines a release-readiness policy only. The policy module does not schedule backups, encrypt files, manage keys, restore databases, or prove that a provider's backup exists.

## Minimum evidence before beta or production

- Confirm backup scope, frequency, retention and encryption with the actual hosting/database providers.
- Keep encryption keys and recovery material separate from the backup data, with restricted access and tested recovery procedures.
- Record a restore exercise against an isolated non-production environment; check row counts, referential integrity, application compatibility and audit trails.
- Define and approve recovery-point objective (RPO) and recovery-time objective (RTO) with business owners; measure them during a restore exercise rather than guessing.
- Assign an incident commander and technical recovery owner; keep an offline or independently accessible runbook.
- Review legal holds, retention duties and personal-data minimization before restoring old records into an active environment.

## Restore approval

A restore requires an authorized operator, approved change ticket, isolated target, verified source backup, data-owner approval and documented production-impact assessment. Production restoration must use a separately approved change window and a tested rollback plan. Never overwrite production as an exploratory test.

## Fail-closed rule

Unknown backup age, missing integrity evidence, untested recovery keys, missing ownership or absent runbook means recovery readiness is not demonstrated. This is not a guarantee of recoverability and does not replace provider-specific disaster-recovery testing.
