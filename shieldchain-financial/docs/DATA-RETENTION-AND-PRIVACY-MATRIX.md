# Data retention and privacy matrix — draft for legal review

This matrix is a planning aid, not a legal determination or configured retention schedule. The retention helper deliberately requires an explicitly supplied period and legal-hold state; it does not set statutory periods or delete records.

| Data class | Suggested handling | Deletion decision |
| --- | --- | --- |
| Security audit | Minimize fields, restricted access, integrity monitoring | Eligible only after approved period and hold check |
| Authentication sessions | Short-lived, revoke on logout/security event | Expired sessions may be reviewed for cleanup |
| Identity evidence | Highest restriction; provider-hosted evidence preferred where suitable | Compliance/privacy review required |
| Support content | Minimize personal data; separate internal notes | Eligible after approved period, hold and case review |
| Product analytics | Prefer aggregation and pseudonymization | Review for minimization and aggregation first |
| Financial records | Restrict access and preserve transaction integrity | Compliance review required; never blindly delete on request |

## Required before collection
- Obtain Australian privacy/legal advice and map applicable jurisdictions, financial-service obligations and data residency needs.
- Document purpose, lawful basis/consent where required, notice wording, access controls, retention owner and approved period for each field/class.
- Define data access/correction/deletion requests, legal holds, backups, exports, processors/subprocessors, breach handling and deletion verification.
- Keep identity documents, credentials, seed phrases and private keys out of support tickets and logs.
- Test retention jobs in staging with dry-run reports, approval records and rollback/restore procedures before enabling deletion.
