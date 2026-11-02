# Premium Software Access — approved pricing, activation disabled

- Owner-approved customer price: **AUD $9.95 per month**, billed monthly.
- Cancellation takes effect at the end of the paid period; paid access continues until
  that date and further renewals stop after provider-confirmed cancellation.
- The Beginner Handbook and basic educational features remain free.
- Premium includes enhanced calculators, educational analytics and dashboard features.
  No trading profits or financial returns are promised.
- Stripe merchant/product eligibility is unverified. Live activation is NOT_AUTHORISED.

The earlier proposal and e781312 are preserved in Git history. See
[owner approval record](OWNER-PRICING-APPROVAL.md) for the exact scope of approval.
No product, subscription or customer charge has been created at Stripe.

Public `/pricing` and pre-checkout billing show renewal price, cancellation and refund
information. Acceptance is unchecked by default, required by the server, and recorded
with a terms version and timestamp. Provider terms consent is required as well.

Refund information: cancellation does not itself refund an existing payment. Customers
may request review of billing errors/refunds with an invoice reference, without exclusion
of statutory rights including Australian Consumer Law. Entity/GST presentation, final
legal documents and operational support must be reviewed before sales.

The read-only local command `node scripts/configure-premium-product.mjs --show-proposal`
shows the current offer without credentials or network calls (the flag is retained for
compatibility). Actual provider Price import remains disabled by default and never
asserts merchant acceptance. SF Crypto Payments remains entirely separate.
