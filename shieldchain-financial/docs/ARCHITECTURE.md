# ShieldChain Financial — architecture and delivery plan

## Current state

This is a **starter scaffold**, not a deployed or production-ready financial service. It includes a responsive Next.js/TypeScript website, a sample dashboard, a clearly labelled admin placeholder, a health endpoint and a Prisma schema draft. The dashboard numbers and market prices are illustrative static data. There is no authentication, database connection, trading connection, AI API, payment processor, wallet, custody, payout or feedback persistence enabled.

## Proposed architecture

- **Web:** Next.js App Router + TypeScript; accessible responsive UI.
- **API/domain:** typed server routes/services; validate every input at the boundary; deny by default.
- **Data:** PostgreSQL with Prisma migrations; monetary quantities use fixed-precision decimal types and explicit currency/network identifiers.
- **Async jobs:** later add a durable queue for provider webhooks, reconciliation, emails and risk calculations.
- **AI assistant:** later add an isolated service with approved read-only tools first; financial writes must never be delegated directly to a language model.
- **Observability:** structured redacted logs, request IDs, metrics, alerts and an incident response runbook.

## Non-negotiable design rules

1. Demo data and real customer balances must be distinct by environment, schema/domain boundary and UI labels.
2. Never represent simulated buying power as customer funds or a cash balance.
3. Financial ledger entries must be append-only, balanced, idempotent and reconciled against providers. No direct AI edits to a ledger.
4. Verify provider webhook signatures; use idempotency keys; reject replays and record provider event IDs.
5. Every privileged action needs server-side authorization, least privilege and an audit event.
6. Secrets belong in a secrets manager or deployment environment—not source control, browser bundles or logs.
7. Never collect real identity documents, payment data, seed phrases or private keys in this scaffold.
8. Show jurisdiction-specific eligibility and product disclosures only after legal/compliance approval.

## Build sequence

### Phase A — foundation
- Confirm company/entity details, product scope and jurisdictions with counsel.
- Pick deployment region and vendors; define data retention, privacy and incident response.
- Add automated tests, CI, error reporting, dependency scanning and environment separation.

### Phase B — identity and customer support
- Select an established authentication/identity provider; implement MFA/passkeys, recovery, session revocation and account status checks.
- Add consent and privacy preferences, support ticket persistence, notification preferences and human escalation.

### Phase C — simulation engine
- Define and version challenge rules with product/legal approval.
- Use deterministic server-side calculations and immutable event records.
- Test edge cases: day boundaries/time zones, fees, rounding, stale market data, simultaneous orders and retries.

### Phase D — regulated/provider integrations
- Legal review of financial product, market, custody, payments, AML/CTF, sanctions, privacy, tax and consumer obligations in each target market.
- Written confirmation from trading, payment and custody providers that the intended prop-trading/crypto use is permitted.
- Threat model, independent penetration test, disaster recovery and reconciliation test before live funds.

### Phase E — controlled launch
- Limited beta, capped exposure, documented support/escalation, monitored incident drills and rollback plan.
- Enable each live capability separately only after its own approval gate.
