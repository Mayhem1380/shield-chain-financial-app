# ShieldChain Financial — Competitive Pricing Strategy

**Status:** proposed strategy for modelling and review; not an approved public fee schedule. All amounts and rates below are hypotheses until provider quotes, liquidity, operating costs, jurisdictional requirements and customer research are available.

## Strategic position

ShieldChain should compete on **total value and clarity**, not promise to be the cheapest at every service. Our customer promise should be: transparent all-in quotes, fair fees, useful tools, predictable rules, helpful education and responsive support. Do not market returns as guaranteed or use customer losses as a revenue plan.

## Competitor benchmark (public pages checked 20 October 2026)

- **Binance Australia spot:** its published regular-user spot schedule shows 0.100% maker / 0.100% taker, with a displayed discounted schedule of 0.075% / 0.075% when paying fees with BNB; eligibility and pair-specific rules apply. Source: https://www.binance.com/en-AU/fee/trading
- **Kraken Pro:** its public schedule uses maker/taker pricing and tiers; the displayed entry spot tier is 0.40% maker / 0.80% taker, with lower rates at higher activity/asset tiers. Other Kraken interfaces and pairs can use different pricing. Source: https://www.kraken.com/au/features/fee-schedule?mode=consumerapp
- **Coinbase Advanced:** fee depends on product, maker/taker role and tier; current rates are presented to the signed-in user and may vary. Source: https://help.coinbase.com/en/coinbase/trading-and-funding/advanced-trade/advanced-trade-fees

These are not perfectly like-for-like comparisons: market, product, pair, jurisdiction, discounts and spread differ. Re-check official schedules immediately before any launch and keep a dated comparison log. Never claim “lowest” or “best” without a controlled, current comparison including spread and all costs.

## Proposed spot-fee hypothesis to test

| Tier | Qualification hypothesis | Maker | Taker | Intended value |
|---|---|---:|---:|---|
| Standard | All eligible customers | 0.10% | 0.10% | Clear, simple entry pricing aligned with a major benchmark |
| Active | 30-day eligible spot volume >= US$10,000 | 0.08% | 0.10% | Reward regular activity without requiring a token purchase |
| Advanced | 30-day eligible spot volume >= US$100,000 | 0.06% | 0.08% | Meaningful discount for more active traders |
| Pro | 30-day eligible spot volume >= US$1,000,000 | 0.04% | 0.06% | Competitive pricing for high-volume customers, subject to unit economics |

These tiers are **illustrative proposals only**. The thresholds should be tested against expected customer distribution, liquidity-provider economics, market-making arrangements, support/compliance costs and anti-wash-trading controls. Calculate tiers from eligible, settled, non-self-dealing activity and publish exclusions clearly. Do not require customers to buy or hold a ShieldChain token to receive a fair rate.

## Swap / convert pricing

Do not reuse spot-book rates blindly for instant swaps. For each quote, show before confirmation:
- source amount and asset, destination asset and estimated receive amount;
- platform fee as both percentage and currency amount;
- provider/liquidity charge, network/route cost, spread and any slippage assumption (each separately identified where available);
- quote expiry, execution conditions, minimums and what happens if the quote fails;
- whether the estimate is guaranteed or indicative.

A **0.35% platform fee** may be used as a scenario for modelling, not as an approved rate. Compare 0.25%, 0.35% and 0.50% against provider charges and realistic order sizes. If the provider cost, spread and operational risk make the quote uncompetitive or unprofitable, do not quietly add hidden charges: renegotiate, change routing or do not offer that route.

## Illustrative fee arithmetic

On a $1,000 eligible spot trade, a 0.10% fee is $1.00 per executed side. A 0.08% fee is $0.80; a 0.06% fee is $0.60. These are gross platform-fee examples before rebates, provider costs, payment processing, fraud, support, tax and overhead. Buying and later selling can incur a fee on each execution.

For a hypothetical $1,000 swap, a 0.35% platform fee is $3.50. This is not necessarily the total customer cost: provider charges, network fees and spread may be additional and must be disclosed. Do not show a misleading “total fee” unless it includes all relevant costs.

## Loyalty and acquisition offers

Prefer sustainable benefits over blanket discounts:
- introductory fee credits with a disclosed cap and expiry;
- fee reductions earned through real eligible activity;
- referral rewards only after legitimate, verified activity and anti-abuse checks;
- education, portfolio/trade journaling tools and responsive support as retention benefits;
- optional paid advanced tools only when the free/basic service remains useful and subscription cancellation is straightforward.

Do not use loss-chasing bonuses, pressure timers, guaranteed-profit language, paid rankings or rewards that encourage unsuitable risk. Referral terms and promotions require jurisdiction-specific review.

## Prop-trading challenge economics

Keep challenge pricing separate from exchange fees. Model entry fees, refunds, platform and data costs, verification, support, fraud, payout obligations, dispute rates and reserve needs. Rules must be visible before purchase, objectively calculated, consistently applied and not changed retroactively. Do not launch paid challenges until counsel has reviewed the legal model and operations have demonstrated fair, timely payout handling. Simulated results are not evidence of future live trading outcomes.

## Unit economics and go/no-go test

For each product and customer cohort, estimate:

**Contribution per transaction = collected platform revenue − provider/liquidity costs − network costs subsidised by ShieldChain − payment fees − expected fraud/chargeback/refund loss − variable support/compliance cost.**

Then include fixed costs: engineering, security audits, legal/compliance, staff, insurance where available, infrastructure, customer acquisition and reserves. Test downside scenarios (low volume, volatile markets, provider outage, higher fraud, failed transfers and slower customer growth). No fee is approved until realistic evidence shows positive contribution at target pricing and sufficient capital/reserves for obligations.

## Pricing governance

1. One public source of truth for fees, versioned and dated.
2. Show the fee and estimated total cost before the customer confirms.
3. No retroactive changes to an accepted quote or challenge rule, except legally required handling described in the terms.
4. Monitor customer complaints, effective all-in costs, failed trades, refunds, margin by pair and abusive activity.
5. Review pricing quarterly and after major provider/market changes; notify users fairly before non-urgent changes.
6. Obtain legal, compliance, security and finance sign-off before activating any live service.

## Decisions still requiring evidence

- Target countries and permitted product scope.
- Custody/exchange/quote provider pricing, minimums, service levels and liability allocation.
- Expected user mix, volumes, order sizes, acquisition cost and retention.
- Payment rails, chargeback rates, tax and local operating costs.
- Liquidity, spreads, slippage, outage and reserve assumptions.
- Legal review of exchange, custody, investment-related features and challenge/payout model.
