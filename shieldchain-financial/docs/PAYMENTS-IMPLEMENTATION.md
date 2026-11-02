# Merchant payments implementation and activation blockers

This batch adds real Stripe HTTP integration code, not a simulated payment provider.
It has NOT been tested against a Stripe account or live funds. No account, service,
webhook endpoint, infrastructure or licence has been purchased/provisioned. No deployment
was performed. Live exchange, wallet custody, prop funding, lending and card issuance
remain outside this merchant adapter.

## Implemented

- Authenticated `/billing` shows only server-approved products and the signed-in
  customer's actual database payment records. It redirects to Stripe-hosted checkout.
  There are no seeded products, fabricated balances, successful demo payments or PAN inputs.
- `POST /api/billing/checkout`: immutable AUD minor-unit amount snapshots, server Price
  verification, fixed return origin, durable per-customer idempotency, hosted card capture
  and 3DS request. Initial ceiling AUD 1,000 per purchase; provider fraud controls still needed.
- `GET /api/billing/products` and `/payments`: owned records only, no cache.
- `POST /api/billing/reconcile`: ownership checked and canonical Session/PaymentIntent/
  captured Charge amount, currency, mode and metadata matched. Redirects never grant access.
- `POST /api/billing/webhook`: bounded raw body, HMAC-SHA256 constant-time comparison,
  5-minute timestamp tolerance, rotation-compatible signature matching, strict test/live
  separation, account isolation, unique event ledger and transactional audit/order updates.
- `POST /api/billing/refunds`: DB staff role plus fresh MFA, one full refund reservation,
  stable provider idempotency, retry cutoff, canonical refund-status reconciliation.
  Partial refund UI and multiple partial-refund operations are not implemented.
- `node scripts/reconcile-payments.mjs --run`: batch reconciliation, error audit,
  rate-limit TTL cleanup. Must be run by a supervised worker with secure configuration.
  No scheduler is provisioned. Reconciliation compares payment/refund objects, not yet
  provider balance transactions, fees, bank settlements or accounting exports.
- Orders, refunds and event identifiers persisted through Prisma/PostgreSQL; DB advisory
  transaction locks protect state changes. Refund totals never regress on stale delivery;
  fraud/dispute holds never auto-clear. No customer wallet or trading balance is credited.
- API errors expose codes and correlation IDs, not provider messages, credentials or PII.

## Required account, credentials and approvals

1. Owner must specify the actual first product, terms, AUD gross price, refund policy
   and Australian selling entity (ABN/ACN, address, beneficial owners and bank settlement
   account). Do not relabel financial products as software to evade provider restrictions.
2. Provider must accept the entire business and the specific product in writing. Stripe's
   current Australian prohibited-business list includes **funded prop trading** and crypto
   mining/staking; this adapter deliberately accepts only `SOFTWARE_ACCESS` or
   `EDUCATION_SERVICE` records with independent legal/provider references and expiry.
   These categories are technical scope limits, NOT a determination that ShieldChain is
   eligible. Exchange/wallet funding, prop entry fees, loans, rentals tied to mining and
   payouts need a legitimately supporting provider and separate reviewed integrations.
3. Configure sandbox first: `DATABASE_URL`, `PAYMENTS_MODE=test`, `STRIPE_SECRET_KEY`
   (`sk_test_...`), `STRIPE_WEBHOOK_SECRET` (`whsec_...`), and an exact HTTPS
   `PAYMENTS_ORIGIN` without a trailing slash. Inject through secret management; do not
   paste keys in chat or Git. No publishable key is required for hosted checkout.
4. Live mode additionally requires `sk_live_...`, separate live webhook secret, matching
   live Price IDs, `PAYMENTS_MODE=live`, `PAYMENTS_LIVE_ENABLED=true`,
   `PAYMENTS_APPROVAL_REFERENCE` and `PAYMENTS_SECURITY_REVIEW_REFERENCE`.
   These references are operator-controlled review evidence, not automatic legal checks.
5. Enable each reviewed PaymentProduct through a privileged operations process, with
   currency `aud`, integer amountMinor matching an active one-time Stripe Price,
   provider/legal review references and approvedUntil. No product is enabled by default.
6. Complete provider account verification, bank verification, charge/settlement activation,
   Radar rules, velocity and geography controls, chargeback evidence runbook and receipt
   branding/email configuration. 3DS is requested; it does not eliminate fraud or disputes.
7. Connect real identity/MFA before checkout: trusted identity adapter must issue a random
   32-byte hex `__Host-sf_session` cookie with Secure, HttpOnly, SameSite=Strict, Path=/,
   no Domain; persist SHA-256 tokenHash, verified ACTIVE User, mfaEnabled and session
   mfaVerifiedAt after an actual MFA challenge. Billing mutations require MFA within
   15 minutes. Revocation/expiry are enforced on every request. No identity adapter or
   session-issuance endpoint was invented in this batch; it remains a deployment blocker.
   Only privileged operations may grant `billingRole=REFUNDS` or `ADMIN`.
8. PostgreSQL schema generation/migration, connection pooling, TLS, encrypted backups,
   tested restore, runtime/migration role separation and append-only audit permissions.
   A generated/reviewed migration and DB integration tests are still required. Never run
   `prisma db push` or reset against an existing customer database.

## Provider delivery and reconciliation

Register the HTTPS `/api/billing/webhook` endpoint against the same merchant account and
mode as its key, pin API version `2026-10-28.endive`, and subscribe to:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`,
`charge.dispute.created`, `refund.created`, `refund.updated`, `refund.failed`.
Unknown signed events are ignored. Early deliveries for unmapped orders return retryable
errors. Provider network failures leave durable operation reservations; retry with the same
key within 20 hours, then require operator reconciliation instead of risking key expiry.
No customer fulfilment is inferred from a webhook or browser payload alone.

Run a reconciliation worker at least every five minutes with overlap/alerting controls.
Work queue is bounded to 100 oldest-reconciled orders per run; size worker throughput
accordingly. Alert on unapplied webhooks, reconciliation mismatch, stale CREATING orders,
pending refunds, risk holds and provider/API/DB failures. Monitor HTTP 5xx by request ID;
durable failure telemetry, operational alert delivery and bank-settlement reconciliation
remain to be connected. Refund safely through the provider dashboard if the app is down.

## Australian launch review (not a licence determination)

Obtain current Australian legal advice on the exact entity, products, customers and flow
of funds. AUSTRAC registration/enrolment and AML/CTF obligations apply where designated
virtual-asset/remittance services are provided; use current VASP guidance, not obsolete
digital-currency-only assumptions. Address KYC/CDD, beneficial ownership, sanctions/PEP
screening, reporting, record retention, AML compliance officer and applicable Travel Rule.
ASIC treatment depends on the rights/benefits and services: AFSL/authorised-representative,
market/clearing/custody requirements, retail disclosures, IDR and AFCA may apply. Credit
licensing/NCCP may separately apply to collateral loans. These are unresolved questions,
not claims that every licence applies or has been obtained.

Review Australian Consumer Law, pricing/GST/tax invoices and refund rights; Privacy Act,
APPs/cross-border processors and Notifiable Data Breaches obligations where applicable.
Hosted checkout reduces card-data exposure but does not confer PCI DSS compliance:
confirm SAQ scope with the acquirer, secure scripts/dependencies, access controls,
penetration testing, secrets rotation, incident response and ongoing vulnerability review.

## Required verification before claiming operational

Dependency install/lockfile, Prisma generate/validate, reviewed DB migration, full Next
build/typecheck, browser journeys and real PostgreSQL concurrent/idempotency/rollback
tests are blocked here by unavailable tooling/dependencies/network. Existing dependency-
free tests exercise contract/security logic with explicit fixtures, not real Stripe calls.

After onboarding: provider sandbox checkout -> 3DS -> signed webhook -> owned payment
record -> provider receipt -> full refund -> refund webhook -> reconciliation, including
failed payments, replay, duplicate delivery, revoked sessions, foreign order access,
concurrent refund requests, timeouts and database rollback. Then, only after owner release
approval and provider/legal/security clearance, verify an authorised genuine small live
transaction and refund through bank/provider reconciliation. Record redacted provider IDs
and timestamps. No such genuine transaction has occurred in this session.

## Official references checked 2026-11-01

- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/api/refunds/create
- https://docs.stripe.com/api/idempotent_requests
- https://docs.stripe.com/webhooks
- https://stripe.com/au/legal/restricted-businesses
- https://www.austrac.gov.au/industry-and-business/your-industry/virtual-asset-service-providers/virtual-asset-service-providers-overview
- https://www.austrac.gov.au/new-austrac/register-us/register-us-remittance-or-virtual-asset-service-provider
- https://www.asic.gov.au/regulatory-resources/digital-transformation/digital-assets-financial-products-and-services
