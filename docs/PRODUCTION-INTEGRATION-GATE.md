# Production integration gate

The platform remains a prototype until every applicable gate is evidenced and signed off.

## Engineering and security
- [ ] Reviewed dependency lockfile and repeatable clean install; CI build, typecheck, lint and all tests pass.
- [ ] Prisma schema validation, reviewed migrations, backup/restore test and PostgreSQL integration tests pass.
- [ ] Trusted identity provider configured; email verification, MFA, secure cookies, CSRF/origin protection, session rotation/revocation and rate limits tested.
- [ ] All customer/staff routes use server-side identity, resource ownership and least-privilege authorization; IDOR tests pass.
- [ ] Append-only audit sink, alerting, retention, privacy review and incident-response exercises are operational.
- [ ] Secrets manager, key rotation, WAF/rate limits, dependency scanning, monitoring and tested rollback are configured.

## Business, privacy and finance
- [ ] Australian legal/compliance review determines required licenses/registrations and product restrictions for every intended service and jurisdiction.
- [ ] Privacy notice, terms, complaints process, identity verification, sanctions/AML obligations (if applicable), data retention and breach process are reviewed by qualified professionals.
- [ ] Payment, custody, exchange, identity and email providers have approved contracts, sandbox tests, reconciliation and outage procedures.
- [ ] Ledger design, idempotency, transaction state machine, reconciliation, limits, fraud controls and independent security review are complete before any real funds move.
- [ ] Customer support staffing, restricted queues, incident contacts, status communications and refund/dispute process are operational.
- [ ] Risk disclosures, fee schedules and marketing claims are substantiated; no guaranteed returns or unsupported license/security claims.

## Release decision
A named accountable owner must record evidence and explicitly approve each applicable gate. Until then, keep the site labelled as a demo, health readiness false, and live trading/payments/wallets/withdrawals disabled. Passing repository tests is not a production approval.
