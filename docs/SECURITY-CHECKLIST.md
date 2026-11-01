# Security and launch gate checklist

Do not enable live funds or trading until all applicable items are completed and independently reviewed.

## Identity and access
- [ ] Production authentication provider configured; secure cookies and session revocation.
- [ ] MFA/passkeys, secure recovery, rate limits, bot protections and login alerts.
- [ ] Server-side role/tenant authorization tests for every protected route.
- [ ] Admin access separated, least privilege, MFA enforced, break-glass process documented.

## Financial integrity
- [ ] Approved ledger design; no mutable balance fields as source of truth.
- [ ] Idempotent commands and provider webhook verification/replay protection.
- [ ] Reconciliation, exception queue, refunds, chargebacks and payout approval workflow.
- [ ] Currency precision and crypto network/asset identifiers explicitly modelled.
- [ ] AI tools cannot create/alter ledger entries or authorize withdrawals.

## Application and infrastructure
- [ ] Secrets manager, rotation plan, least-privilege database roles and TLS.
- [ ] Dependency/container scanning, SAST, DAST and independent penetration test.
- [ ] Redacted structured logs, audit trail, monitoring and incident response contacts.
- [ ] Encrypted backups, tested restoration, recovery objectives and disaster drills.
- [ ] Privacy impact assessment, retention/deletion schedule and access request process.

## Legal and operations
- [ ] Jurisdiction-by-jurisdiction legal opinion and required licences/registrations.
- [ ] AML/CTF, sanctions, KYC, complaints and suspicious activity processes as applicable.
- [ ] Product terms, risk warnings, fees, refund rules and marketing claims reviewed.
- [ ] Providers approve the exact use case in writing.
- [ ] Support staffing and escalation SLAs tested before inviting real customers.
