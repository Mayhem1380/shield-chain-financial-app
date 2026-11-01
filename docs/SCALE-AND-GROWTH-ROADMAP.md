# ShieldChain Financial — Scale and Growth Roadmap

**Status:** internal planning document, 20 October 2026. This is a direction-setting plan, not a forecast, guarantee of success, or approval to launch financial services.

## North-star ambition

Build a trusted, useful, profitable digital-finance platform capable of competing with established exchanges. The ambition is to create a multi-million-dollar business; no valuation, revenue, customer count, or return is guaranteed. We will not equate downloads, sign-ups, trading volume, or customer assets with company revenue or value.

## Strategic thesis

Do not try to copy every product a large exchange offers on day one. Start with one well-defined customer segment and a narrow product that is materially easier to understand. Earn repeat use through clarity, fair all-in pricing, dependable support, transparent rules and strong controls. Expand only when customer evidence and unit economics justify it.

### Phase 0 — Foundation (current)

**Goal:** a credible private prototype and a decision-ready business plan.

- Keep all wallet, exchange, trading, challenge and payout features in demo mode.
- Label sample prices and simulated balances prominently; never imply live execution.
- Define the first target customer, problem and launch geography before adding more features.
- Interview prospective users and test usability; collect no sensitive financial information in an unsecured prototype.
- Build a competitor matrix that compares the same asset pair, order size, market type, customer tier, spread, network/provider costs and fiat funding method.
- Obtain indicative written quotes from liquidity, custody, identity verification, payment and monitoring providers before modelling fees as viable.
- Define support ownership, incident response, complaints handling, data retention and customer communications.

**Gate to Phase 1:** product scope and first jurisdiction agreed; customer problem validated; rough unit economics documented; legal/compliance counsel engaged; no unresolved critical design/security issues in the proposed beta scope.

### Phase 1 — Closed, non-custodial research beta

**Goal:** validate the experience without taking custody of customer assets or executing real financial transactions.

- Invite a small, consented cohort; use synthetic/demo balances and test data.
- Measure activation, task completion, repeat use, support burden and comprehension of fee/risk disclosures.
- Run usability tests on mobile, tablet and desktop, including accessibility and low-bandwidth conditions.
- Establish a clear feedback loop and a human escalation path for complaints and security concerns.
- Do not call a visual-only form an account, working sign-up, wallet or support ticket system.

**Gate to Phase 2:** repeatable user value demonstrated; no critical privacy/security issues; support processes tested; cost assumptions updated from evidence.

### Phase 2 — Provider-backed pilot, only after approvals

**Goal:** test a tightly scoped real service with suitable licensed/registered partners, if required and approved.

- Obtain legal advice for each intended country and each product (spot exchange, conversion, custody, payments, derivatives/challenges, rewards and promotions can be treated differently).
- Confirm required registrations, licences, disclosures, eligibility checks, complaints and reporting obligations before enabling the service.
- Use independent security review, threat modelling, penetration testing, incident response exercises and recovery tests.
- Integrate provider APIs with signed webhook verification, idempotency, reconciliation, append-only audit records and clear transaction state handling.
- Set conservative transaction/withdrawal limits, fraud monitoring, manual review and a tested incident shut-off process.
- Keep financial ledger changes outside any generative AI assistant; AI must not decide payouts, change balances or alter rules.

**Gate to Phase 3:** written legal/compliance approval, security sign-off, provider approval, tested reconciliation, funded operational reserves and explicit owner approval for live service.

### Phase 3 — Repeatable growth

**Goal:** acquire and retain suitable customers without buying unprofitable volume.

- Prioritise referrals based on genuine customer satisfaction, useful education and product reliability.
- Test one acquisition channel at a time; track cost per activated and retained customer, not just cost per registration.
- Introduce fee credits or promotions only with a cap, expiry, clear terms and anti-abuse controls.
- Localise only after support, legal coverage, payment methods and provider operations are ready in that market.
- Add products based on measured customer demand and risk-adjusted contribution, not feature-count competition.

### Phase 4 — Expansion

Potential later areas: advanced trading tools, recurring purchases, business accounts, payments, education, portfolio reporting and additional assets. Custody, yield, staking, leverage, derivatives, prop challenges and token-based incentives require separate legal, risk and economic review; none is automatically approved by this roadmap.

## Operating scorecard

Review weekly in beta and monthly after launch. Define each metric precisely and segment it by geography, cohort and product.

| Area | Metrics to track | Guardrail |
|---|---|---|
| Customer value | Activation, successful task completion, 30/90-day retention, satisfaction | Do not optimise for risky trading frequency |
| Acquisition | Cost per activated customer, referral quality, channel payback | Exclude bots, duplicate accounts and incentive abuse |
| Economics | Net revenue, contribution per transaction, contribution per active customer, CAC payback, fixed-cost runway | Separate gross trading volume from revenue and profit |
| Reliability | Availability, latency, failed transactions, reconciliation breaks | Stop affected flows when balances or transaction state are uncertain |
| Trust and safety | Account takeover, fraud losses, complaints, response time, security incidents | Escalate critical cases; never conceal incidents or manipulate records |
| Compliance | Verification completion, monitoring alerts, review backlog, overdue obligations | No service in a jurisdiction/product without approval |

## Unit-economics model

For each product and customer segment:

**Contribution per transaction** = platform revenue − liquidity/provider costs − network/route subsidies − payment processing − rebates/promotions − expected fraud/chargeback/refund losses − variable support and compliance cost.

**Monthly operating result** = total contribution across products − fixed operating costs (staff, engineering, cloud, legal, insurance, security, audits, and other overheads).

**Break-even volume** is not meaningful until the contribution margin, product mix, fixed cost base and customer behaviour are supported by evidence. Run base, downside and severe-stress cases; test lower volumes, higher provider costs, lower retention, fraud spikes and delayed launch. Do not treat customer assets or gross trading volume as company income.

## Competitor benchmark discipline

Binance's public Australian spot schedule currently displays a 0.10% regular maker/taker rate and a 0.075% discounted maker/taker rate for eligible BNB fee payment, with further volume tiers and pair-specific terms. Source: https://www.binance.com/en-AU/fee/trading (checked 20 October 2026). This is a reference point, not proof that ShieldChain should match every rate. Recheck the official schedule and compare equivalent products immediately before any public pricing decision.

A competitive comparison must include the full customer cost: platform fee, spread, slippage, network/route charges, deposit/withdrawal fees, FX conversion and any eligibility or token-holding conditions. Do not claim “cheapest”, “best”, “safest” or “better than Binance” without substantiated, current and appropriately scoped evidence.

## Immediate next actions

1. Decide the first customer segment and first country for the proposed pilot.
2. Ask prospective users to test the current demo and document their biggest trust/usability blockers.
3. Request indicative provider pricing and service details; compare at realistic trade sizes and expected volumes.
4. Build a scenario model with low/base/high volume, fee rates, provider costs, conversion/retention, acquisition cost and fixed costs.
5. Obtain qualified Australian legal advice and map each proposed product to its requirements before any live service.
6. Finish identity/access control, persistence, monitoring and support implementation before collecting real user information.
7. Run dependency installation, type checking, automated tests, accessibility checks and security review; record actual outcomes rather than assuming success.

## Non-negotiable launch gates

No public deployment, purchases, real customer deposits, custody, trading, swaps, payments or payouts without explicit owner approval. Before any such approval is sought, provide a written readiness pack covering legal scope, provider contracts, security test results, operational runbooks, incident response, reconciliation, customer terms, disclosures, support coverage and downside economics.
