# ShieldChain Financial Premium Software Access

## Owner-confirmed scope

Product: **ShieldChain Financial Premium Software Access**.
Purpose: educational tools, crypto calculators and premium dashboard features.
Provider preference: **Stripe**. Currency: **AUD**.
Merchant approval and approval of this specific product remain **UNVERIFIED**.
Owner-approved price: **AUD $9.95 per month**, billed monthly (995 minor units). Customer
cancellation takes effect at the end of the paid period, retaining access until that
date and stopping subsequent renewals. Final pricing is owner-approved; merchant eligibility, activation authorisation and
tax presentation remain unresolved. No provider Product/Price or subscription has been
created or enabled. See PREMIUM-PRICING-PROPOSAL.md.

Proprietary **SF Crypto Payments** is separate. It has no call path from this merchant
billing module. This subscription grants software features only: no crypto purchases,
deposits, withdrawable balances, custody, prop fees, mining services or financial payouts.

## Implemented continuation

The previous one-time billing implementation is preserved. Recurring checkout branches
to a dedicated Premium service when an approved PaymentProduct has billingMode
`SUBSCRIPTION`. Only `SF_PREMIUM_SOFTWARE_ACCESS`, the exact owner-confirmed title,
purpose `SOFTWARE_ACCESS` and AUD recurring licensed/per-unit prices are accepted.
Quantity is one; trials, credits, coupons, proration and plan changes are not supported
in this initial strict billing path. They must not be enabled in Stripe's portal.

- Server-created Stripe Customers map to verified Users, separated by test/live mode.
- Durable subscription checkout reservations plus an active-slot uniqueness constraint
  prevent duplicate subscriptions across concurrent requests with different keys.
- Price, gross amount, interval/count, currency and mode are checked against Stripe.
  No browser-supplied price, customer ID, entitlement or payment amount is accepted.
- Subscription metadata and local checkout references are reconciled with Stripe.
  Checkout requires Stripe terms-of-service consent; the version is snapshotted locally.
- Invoice/Invoice Payment/PaymentIntent/captured Charge are read through current Stripe
  APIs. Full payment and the exact billed period must match before access is granted.
- Renewals persist invoices and receipts. Open invoices, past_due, unpaid, paused,
  incomplete, trialing, canceled or expired subscriptions do not grant premium access.
  Cancellation at period end retains access only through the current paid period;
  immediate provider/security cancellation revokes access. Customer cancellation uses
  period-end cancellation as specified by the owner. Versioned terms, renewal pricing
  and refund information are shown before checkout; explicit acceptance is recorded.
- Server-side `requirePremiumAccess` guards both `/premium` and its calculator API.
  Access uses DB-owned identity and subscription data, not browser flags. Test-mode
  subscriptions cannot grant access to a live-mode deployment. Public recovered demo
  pages remain intact; the new Premium page/tools/API are protected.
- Reconciliation must be fresher than 15 minutes; outage or unverified state fails closed.
  Run a worker at least every five minutes and alert before this threshold.
- Full invoice refund requests require a privileged DB billing role plus fresh MFA.
  A reservation suspends access for the current invoice immediately; confirmed refunds
  remove access. A historical-period refund does not erase a separately paid current
  period. Disputes/fraud holds require review and never clear automatically.
- Durable event deduplication, advisory transaction locks, canonical reads and writes in
  one serialized transaction prevent stale webhook/worker responses from restoring
  access after cancellation or refund. Canonical provider reads can hold a transaction
  up to 90 seconds; provision a compatible pooled DB/function/worker timeout and assess
  contention before release. Unit fixtures do not establish real Postgres concurrency.
- Stripe Customer Portal sessions are authenticated, user-scoped, exact-origin and
  fresh-MFA protected. Configuration must enable invoice history, payment-method update
  and cancellation at period end while disabling subscription updates/price changes.
  All provider redirect and invoice/receipt hosts are allowlisted.

## New endpoints

| Endpoint | Purpose |
| --- | --- |
| POST `/api/billing/checkout` | Existing endpoint now supports approved recurring Premium checkout |
| GET `/api/billing/subscriptions` | Owned subscriptions, invoices, receipts and current entitlement |
| POST `/api/billing/subscriptions/reconcile` | Recheck an owned subscription using its local subscriptionId |
| POST `/api/billing/subscriptions/cancel` | Confirm customer-owned period-end cancellation with Stripe, retaining paid access |
| POST `/api/billing/portal` | Create a Stripe-hosted customer billing management session |
| POST `/api/billing/invoice-refunds` | Staff-only full refund by local invoiceId and allowed reason code |
| POST `/api/billing/webhook` | Existing signed endpoint extended for subscription/invoice events |
| POST `/api/premium/risk-calculator` | Server-guarded educational calculation using customer inputs |

`node scripts/reconcile-premium.mjs --run` reconciles up to 100 least-recently-checked
pending/active subscriptions per batch. Size throughput to complete a full pass within
five minutes; no scheduler is deployed. For a missed historic invoice event, redeliver
the original signed provider event. Only latest and specifically notified invoices are
imported automatically; complete historical backfill/paginated exports remain separate
operations work. Stripe's portal provides the provider's complete customer invoice history.

## Configuration without inventing a price or approval

1. Owner has approved AUD $9.95 monthly pricing and paid-period-end cancellation.
   The version-controlled offer records APPROVED pricing and NOT_AUTHORISED activation.
   New live Premium checkout remains blocked even if environment switches are enabled.
   Review tax presentation, refund rights and contractual documents before activation.
2. Obtain Stripe acceptance of the real business and Premium product. Educational
   terminology is not an exemption from financial-service restrictions. Do not enable
   any product prohibited by the provider or use the software description as a workaround.
3. In the approved Stripe environment create/review the real Product and Price outside
   this script. No service is purchased or provisioned by this repository.
4. The read-only `node scripts/configure-premium-product.mjs --show-proposal` command
   shows the proposal without credentials or writes. Once secure test credentials,
   webhook secret, DATABASE_URL and exact HTTPS origin
   exist, `node scripts/configure-premium-product.mjs price_ID` imports the existing
   provider price as **disabled**, only if it matches AUD 995 cents monthly. It intentionally
   clears approval/terms fields. It never creates a price or asserts permission.
5. Through a privileged reviewed operations process, record the real provider/legal
   approval evidence, expiry and current termsVersion before enabling a test product.
   Owner final pricing approval is now recorded; product pricingApprovalReference must
   match the real recorded instruction reference. Live sales additionally require separate
   owner activation authorisation. Never treat pricing approval as activation permission.
   There is no public product-administration endpoint. Separate test/live databases and
   environments; Product code is unique within each database.
6. Add `STRIPE_PORTAL_CONFIGURATION_ID` (non-secret ID) to the existing secure billing
   configuration. Configure verified business URLs/terms, invoice branding and receipt/
   payment-failure email settings in Stripe. The existing live approval/security gates,
   matching live keys and genuinely live Price are also required for live checkout.
7. Connect production identity/MFA/session issuance and reviewed PostgreSQL migrations.
   Additional schema models: BillingAccount, PremiumSubscription, BillingInvoice,
   BillingInvoiceRefund and PremiumBillingEvent. Existing source/history is preserved;
   generate and review an additive migration after restoring dependencies. No DB has
   been reset or migrated. No secret values belong in chat, code, logs or Git.

## Required webhook subscriptions

Keep the merchant events documented in PAYMENTS-IMPLEMENTATION.md, and add:
`customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`;
`invoice.paid`, `.payment_succeeded`, `.payment_failed`, `.payment_action_required`,
`.finalization_failed`, `.voided`, `.marked_uncollectible`.
Use the pinned `2026-10-28.endive` API for the registered event destination as well as
the client. Invoice payment matching uses `/v1/invoice_payments`; subscription periods
come from the Subscription Item, not obsolete top-level period fields.

For provider incidents or revoked approval, turning off app checkout does not by itself
stop Stripe's already-created automatic renewals. Suspend/cancel affected subscriptions
through the approved provider operations process and verify no further charges. Maintain
customer notices and manual refund support while the application is unavailable.

## Refund and accounting limits

Refund reservations are one full refund per invoice, retried using the same provider key
within 20 hours; beyond that require manual reconciliation. Pending/failed-review current
invoice refunds do not silently restore access. Partial refunds, automatic credit notes,
GST adjustment-note generation, settlement/fee reconciliation and full accounting exports
need a further reviewed implementation. Provider hosted invoices/receipts are stored as
links; no Australian tax-invoice compliance claim is made until entity/GST details and
document configuration are reviewed. Provider refunds and subscription cancellation are
separate operations: a refund does not automatically cancel future renewals. Staff must
complete the agreed cancellation process and confirm it in the provider.

## Release verification still required

Local pure/service tests use explicit fake repositories and provider transport fixtures;
fixture prices and approvals are not live products. No real Stripe API, DB, browser or
genuine customer transaction has been verified. Dependency installation, lockfile,
Prisma validation/migration and Next build/typecheck remain blocked by the previously
recorded executor network/tooling limitations.

Before release, verify sandbox subscribe/3DS -> signed events -> invoice/receipt ->
premium authorization -> renewal -> payment failure -> recovery -> cancel at period end
-> expiry -> full refund, with DB rollback and concurrent duplicate-checkout/refund tests.
Then, following explicit release approval and all required acceptance/security/regulatory
reviews, verify a genuine authorised live transaction and refund before claiming that
real payments are operational. No live activation, purchase, deployment or GitHub push
is part of this batch.

## Provider reference material checked during this batch

- https://docs.stripe.com/api/subscriptions/object
- https://docs.stripe.com/api/invoices/object
- https://docs.stripe.com/api/invoice-payment/list
- https://docs.stripe.com/api/invoice-line-item/object
- https://docs.stripe.com/api/customer_portal/sessions/create
- https://docs.stripe.com/billing/subscriptions/webhooks

Customer cancellation uses a verified Stripe update with cancel_at_period_end=true and
no proration. A local request timestamp is not success: only a canonical provider check
returns cancellationConfirmed and noFurtherRenewals. Existing billing reads, refunds,
webhooks and access reconciliation remain available with the new-live-sales switch off
when valid existing-billing credentials remain configured. No billing operation has been
run against a real provider account in this executor.

Cancellation API reference: https://docs.stripe.com/billing/subscriptions/cancel
