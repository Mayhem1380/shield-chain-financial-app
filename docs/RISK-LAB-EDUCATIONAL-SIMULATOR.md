# Risk Lab — educational scenario simulator

## Scope

The `/risk-lab` page lets a visitor adjust a hypothetical Australian-dollar amount, a market-decline percentage and an example fee rate. Calculations run in the browser and update the illustrative remaining amount and impact. The page does not contact a server, persist entries, query market prices, connect a wallet or submit a transaction.

## Calculation model

- Example fee = starting amount × fee rate.
- Market decline impact = starting amount × decline rate.
- Estimated remaining amount = starting amount minus both impacts, floored at zero.
- Total impact is capped at the starting amount to avoid displaying a negative remainder.

This simplified model is not a trading simulator or a forecast. It omits spread, slippage, network charges, taxes, funding, liquidation, price gaps and product-specific terms. The fee rate is an arbitrary user-controlled example, not SF pricing.

## Before production use

Keep the page educational and clearly labelled. Have legal/compliance and accessibility reviewers assess wording and calculations. If adding actual products, quotes or personalised tools, separately review financial-promotion rules, disclosures, suitability boundaries, data collection, testing and provider contracts. Do not present the result as a maximum-loss guarantee.
