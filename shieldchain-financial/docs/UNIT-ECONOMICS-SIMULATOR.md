# ShieldChain Financial — Unit Economics Simulator

## Purpose

The internal `/unit-economics` page is a local, interactive planning tool for testing how fee revenue, provider/liquidity costs, other volume-linked costs, fixed operating expenses and customer acquisition assumptions interact. It is not a forecast, accounting system, approved pricing schedule or proof of profitability.

## Model definitions

- **Platform fee revenue** = monthly executed volume × effective platform fee rate.
- **Provider/liquidity cost** = monthly executed volume × provider/liquidity cost rate.
- **Other variable costs** = monthly executed volume × entered variable cost rate.
- **Contribution before overhead** = platform fee revenue − provider/liquidity cost − other variable costs.
- **Acquisition spend** = new customers acquired monthly × blended customer acquisition cost (CAC).
- **Illustrative operating result** = contribution − fixed operating costs − acquisition spend.
- **Estimated break-even monthly volume** = (fixed operating costs + acquisition spend) ÷ (effective fee rate − provider cost rate − other variable cost rate), provided the contribution rate is positive.

Rates are entered in basis points internally: 10 bps = 0.10%. All amounts are denominated in USD. Values update locally in the browser and are not submitted or stored.

## Known limitations

This simple model does not automatically calculate trading rebates, tier discounts, spread capture, liquidity slippage, per-transaction fixed charges, payment fees, chargebacks, fraud loss, refunds, customer support workload, compliance staffing, tax, financing, working capital, regulatory capital, insurance, one-time build costs or changing cost curves. Add these to a detailed financial model before relying on results. Active-user count is shown as context only and does not currently drive revenue.

## Required scenario review

1. **Downside:** lower volume, weaker retention, higher provider costs, more fraud/support cases and higher CAC.
2. **Base:** use evidence-backed provider quotes and a conservative observed customer mix.
3. **Upside:** increase volume only where acquisition, liquidity, support and compliance capacity can scale.
4. **Liquidity stress:** widen slippage/spread and test volatile-market conditions.
5. **Acquisition stress:** increase CAC and reduce activation/retention assumptions.

Do not use one optimistic output as a fundraising claim or operating forecast. Keep assumptions versioned and compare projections with actuals once a legitimate, approved pilot exists.

## Before financial sign-off

Finance must validate formulas and cost categories; provider quotes must be obtained in writing; legal/compliance must validate the intended product and target jurisdictions; and management must approve any pricing. This page has no connection to live markets, customer accounts, order execution or payment systems.
