# ShieldChain Financial — private beta plan

## Release intent

The first release is a **private beta preparation environment** for a combined product vision: simulated prop-trading challenges, a future exchange experience and a future wallet experience. The current implementation provides interactive UI previews only. It must not accept real funds, create real accounts, place orders, issue deposit addresses or process payouts.

## What is implemented in this iteration

- `/exchange`: selectable sample assets and an order-size estimator using hard-coded illustrative prices. It does not place or queue an order.
- `/wallet`: asset education and a visible checklist of wallet/custody dependencies. No address generation, private keys, deposits or withdrawals.
- `/challenges`: illustrative challenge rules and a small progress calculator. It does not determine eligibility or rewards.
- `/beta`: a session-only release-gate checklist. It is a planning aid, not evidence of completion, approval or certification.
- Dashboard navigation to each preview.
- `/support` FAQ and feedback-form preview with explicit local-only behavior.
- Draft Prisma models for support tickets, messages and feedback; not yet connected to APIs or a database.

## Not implemented

Authentication, persisted beta applications, database writes, role-based admin access, live market data, real trading, KYC/identity collection, payments, custody, wallet keys, deposits, withdrawals, payout ledger, working support APIs and human support queue, AI connection, email delivery, public hosting and production monitoring.

## Release gates before inviting beta users

1. Confirm legal entity, product classification, allowed markets and regulatory obligations with qualified Australian and relevant overseas counsel.
2. Define exact customer journeys, terms, fees, challenge rules, complaints and dispute handling; obtain review and approval.
3. Choose and contract with suitable providers; get written confirmation that each intended use is permitted.
4. Implement authentication with MFA/passkeys, account recovery, session revocation, consent records and server-side authorization.
5. Implement data minimisation, privacy notices, retention/deletion workflows and access logging. Do not collect identity documents until the process and provider are approved.
6. Build and test a deterministic simulation engine with versioned rules, decimal-safe calculations, timezone boundaries, race/retry tests and immutable events.
7. If any real value is later supported, implement an append-only balanced ledger, provider webhook verification, idempotency, reconciliation, segregation/accounting controls where required, dual approval and incident response.
8. Complete independent security review/penetration testing, dependency and secret scanning, backups/restore drills, monitoring, alerting and rollback rehearsals.
9. Run an invite-only test with capped access and no live financial activity; collect feedback only through a reviewed, privacy-aware system.
10. Approve each live capability separately in writing. A beta approval for one module does not approve another.

## Safety and product wording

- Always label demo values as illustrative and not live.
- Never show simulated account value as a cash balance or claim that funds are held or insured.
- Never claim guaranteed profit, risk-free investing, regulatory approval, certification or custody protection without verifiable evidence.
- Do not permit an AI model to write balances, approve payouts, change risk rules or perform privileged actions without deterministic policy controls and human approval.
- Do not place real customer data, API secrets, seed phrases or private keys in source control, logs or this demo.

## Additional planning documents

- `docs/SUPPORT-FEEDBACK-FOUNDATION.md`: ticket workflow, privacy, escalation and access-control requirements.
- `docs/REVENUE-AND-PRICING-PRINCIPLES.md`: pricing disclosure and contribution-margin framework; not an approved fee schedule or forecast.
