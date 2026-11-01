# ShieldChain Financial — combined-platform starter

A responsive Next.js/TypeScript starter for continued development of the ShieldChain Financial concept. This is a local review scaffold for private-beta preparation—not a deployed service and not ready to handle real customer accounts or funds.

## Included

- Responsive public homepage in the ShieldChain navy / electric-blue visual direction.
- Demo dashboard with clearly labelled illustrative figures.
- `/transparency` centre explaining demo-only status, digital-asset risks, fee-disclosure principles and launch conditions.
- Interactive `/exchange` preview with crypto-to-crypto swap calculator, selectable assets, an illustrative platform-fee setting and itemised demo quote; it never submits an order.
- Premium black-and-gold accent treatment layered over the electric-blue ShieldChain identity.
- `/wallet` education page with safety reminders; no addresses, keys, deposits or withdrawals.
- `/challenges` simulated challenge rules and a local progress calculator.
- `/beta` release-gate checklist that stays in the page session and is not saved or submitted.
- `/support` customer-care preview with expandable FAQs, safety messaging, feedback form preview and proposed human-escalation routing; no requests are sent or stored.
- Admin console placeholder with a clear warning that it is not an authenticated admin system.
- `/api/health` status endpoint explicitly reporting that live trading, payments and wallets are disabled.
- Prisma/PostgreSQL schema draft for users, simulated challenges, audit events, support tickets/messages and feedback items (not yet connected to application APIs).
- Architecture, security, account-identity, support/feedback, revenue-pricing and private-beta planning documents.
- Original prototype snapshot and concept artwork in `public/assets/`.

## Run locally

Requirements: Node.js 20+ and npm.

1. Copy `.env.example` to `.env.local` if you want to prepare environment variables. A database is not required just to review the UI.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open `http://localhost:3000`.
5. Check the health endpoint at `http://localhost:3000/api/health`.

The Prisma schema is a draft. Set up a local PostgreSQL database and review the schema before running `npm run db:generate` or `npm run db:migrate`.

## Swap preview details

The exchange page is a local UI simulation only. Its hard-coded sample prices are BTC $67,420, ETH $3,482.60, USDC $1, USDT $1 and SOL $150. These are not live market prices. The example platform-fee options (0.25%, 0.35% and 0.50%) are placeholders for product design and are not approved business pricing. The estimate deducts the selected example platform fee only; it does not include liquidity-provider charges, network/route fees, spread, slippage, taxes or price movement. No real swap can be executed.

For a production model, compare quotes from suitable providers and calculate total unit economics before setting a fee. Display the exchange rate, platform fee, provider/route charges, network fee, spread/slippage assumptions, quote expiry and estimated receive amount before customer confirmation. Never present demo prices as live market data.

## Current limitations

There is no working account registration or authentication, connected database, persisted beta applications, live market data, real trading, payments, crypto wallet/custody, payouts, AI API integration, support-ticket or feedback API/storage, secured admin portal, hosting/domain purchase, legal approval or security certification. Do not enter real customer data.

## Before any beta or production deployment

Read `docs/ARCHITECTURE.md`, `docs/SECURITY-CHECKLIST.md`, `docs/PRIVATE-BETA-PLAN.md` and `docs/TRANSPARENCY-CENTRE.md`. Confirm company details, product scope and each target jurisdiction with qualified counsel. Select providers deliberately, implement identity/access and data protection, complete testing and independent security review, and obtain explicit approval before enabling any live capability. No purchase or deployment is performed by this package.

## Account foundation

The `/account` route is a visual-only registration/sign-in preview. It does not create accounts or authenticate users. See `docs/ACCOUNT-IDENTITY-FOUNDATION.md` for provider integration and security requirements. The detailed activation and withdrawal state model is in `docs/IDENTITY-AND-WITHDRAWAL-CONTROL-PLAN.md`. The Prisma schema includes provider identity fields and hashed-token session storage as groundwork only; no provider or database is configured by default.


## Support and feedback foundation

The `/support` route is a UI preview only. It does not transmit or save form contents. The Prisma schema now includes draft `SupportTicket`, `SupportMessage` and `FeedbackItem` models, but no APIs or database migrations are implemented. Read `docs/SUPPORT-FEEDBACK-FOUNDATION.md` before implementing any live support channel.

## Revenue and pricing principles

`docs/REVENUE-AND-PRICING-PRINCIPLES.md` outlines possible revenue streams, unit economics, fee disclosure requirements and pricing approval gates. All fee values shown in the UI remain illustrative and unapproved.

## Pricing strategy
See `docs/COMPETITIVE-PRICING-STRATEGY.md` for the proposed tier hypothesis, dated public competitor references, swap quote disclosure requirements, unit-economics formula and approval gates. Rates are planning scenarios only, not live or approved pricing.

## Scale and growth roadmap
`docs/SCALE-AND-GROWTH-ROADMAP.md` defines phased validation, launch gates, scorecard metrics, unit-economics discipline and the immediate next actions for building a sustainable business. It is a planning document, not a promise of valuation or approval to enable live financial services.

## Unit economics simulator
The internal `/unit-economics` route is a local interactive scenario calculator for testing indicative fee revenue, variable costs, acquisition spend, fixed costs and a simple break-even volume estimate. It is not a forecast and all values are illustrative assumptions. See `docs/UNIT-ECONOMICS-SIMULATOR.md` for formulas, limitations and required scenario checks. It does not use live data, store inputs or execute financial activity.

## New documentation
- `docs/BEGINNERS-HANDBOOK-AND-IDENTITY-REQUIREMENTS.md` — handbook content, KYC/email verification and withdrawal controls.
- `docs/RELEASE-READINESS-AND-THREAT-MODEL.md` — trust boundaries, threats, baseline headers and staged release gates.

## Static repository preflight
Run `npm run preflight` for a lightweight check of required project files and critical demo-mode disclosures. This does not replace dependency installation, linting, TypeScript checks, a production build, automated tests or an independent security review.

### Brand line and AI crawler preferences
- Primary line: **Invest with SF. Protect what matters.** This is brand positioning, not a guarantee that investments or assets cannot lose value.
- `app/robots.ts` requests that known AI-related crawlers do not crawl the public site. This is voluntary and does not stop manual copying or enforce access controls.
- See `docs/AI-CRAWLER-AND-PLATFORM-PROTECTION.md` for limitations and the security checklist before launch.

## Automated engineering quality gates

A GitHub Actions workflow at `.github/workflows/quality-gates.yml` defines Prisma client generation, static preflight, TypeScript, ESLint and production-build checks for pull requests and pushes to the main branch. It has not been run remotely from this workspace. The repository still needs a reviewed npm lockfile for reproducible dependency installation. See `docs/ENGINEERING-QUALITY-GATES.md` for release requirements and limitations.


## Brand asset library

Founder-supplied SF concept artwork is stored as optimized WebP assets in `public/assets/`. The homepage uses a curated responsive gallery with concept-art disclaimers. See `docs/BRAND-ASSET-LIBRARY-AND-CAMPAIGN-GUARDRAILS.md` for the inventory and required review of giveaway, wealth, safety and product-availability claims.

## Database and migration readiness

The `db:preflight` script checks key schema invariants without connecting to a database. See `docs/DATABASE-AND-MIGRATION-READINESS.md` for migration, backup, access-control, and release gates. It is not a substitute for Prisma validation or PostgreSQL integration tests. Dependency lockfile generation timed out in the current build environment, so this edition does not claim reproducible dependency installation; generate and review a real lockfile before switching CI to `npm ci`.


## Authentication flow policy foundation
`lib/auth-flow-policy.mjs` provides testable, provider-neutral decisions for sign-in prerequisites, one-time verification/recovery tokens, generic password-reset responses, and sliding-window attempt limits. It is policy code only: provider verification, database persistence, atomic token consumption, email delivery and session creation are not implemented. See `docs/AUTHENTICATION-FLOW-POLICY.md`. Run `npm run test:auth-flow` or the complete policy suite with `npm run test:policy`.


## Additional policy foundations
- `lib/security-event-policy.mjs`: allowlisted security event envelopes and defensive log redaction policy.
- `lib/support-ticket-policy.mjs`: ticket intake routing, ownership-aware transition decisions, restricted queue and internal-note visibility rules.
- See `docs/SECURITY-EVENT-LOGGING-FOUNDATION.md` and `docs/SUPPORT-TICKET-WORKFLOW-POLICY.md`. These helpers do not provide authentication, persistence, or production authorization by themselves.
- `lib/data-retention-policy.mjs`: explicit retention-period and legal-hold decision helper; it never deletes records.
- Draft operational documents: `docs/DATA-RETENTION-AND-PRIVACY-MATRIX.md`, `docs/INCIDENT-RESPONSE-PLAYBOOK.md`, and `docs/PRODUCTION-INTEGRATION-GATE.md`.


## Provider webhook and release-gate foundations
- `lib/provider-webhook-policy.mjs` defines admission checks for verified signatures, timestamp freshness, allowlisted event types and persisted idempotency state. It does not perform cryptographic verification, store events, or execute provider actions. See `docs/PROVIDER-WEBHOOK-INTEGRATION-CONTRACT.md`.
- `lib/release-gate-policy.mjs` provides fail-closed release and live-capability gate decisions. It does not deploy code or enable live services. See `docs/RELEASE-GATES-AND-CAPABILITY-FLAGS.md`.
- Run `npm run test:webhook-policy` and `npm run test:release-gates`, or `npm run test:policy` for the full pure-policy suite.

## Recovered commercial billing continuation

The owner-confirmed first fiat product is **ShieldChain Financial Premium Software Access**
(educational tools, crypto calculators and premium dashboard features), using Stripe in AUD.
Price and billing interval are not configured, and provider permission remains unverified.

See [Premium billing implementation and activation requirements](docs/PREMIUM-SOFTWARE-BILLING.md).
The working code includes recurring hosted checkout, customer billing/portal, invoice/receipt
records, full invoice refund operations and server-checked premium access. Run
`npm run test:premium` for fixture-based tests. No live transaction has been verified.
SF Crypto Payments remains a separate future integration with no access to this fiat flow.
