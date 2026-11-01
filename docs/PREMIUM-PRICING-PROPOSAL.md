# Premium Software Access — pricing proposal for review

| Item | Proposal |
| --- | --- |
| Product | ShieldChain Financial Premium Software Access |
| Provider | Stripe; merchant/product eligibility not yet confirmed |
| Customer price | AUD $9.95 per month |
| Server amount | 995 AUD minor units |
| Billing | Monthly; automatic renewal at the same price until canceled |
| Customer cancellation | Effective at the end of the current paid billing period |
| Access after cancellation | Retained through the verified paid-period end |
| Renewals after confirmed cancellation | None |
| Free | Beginner Handbook and basic educational features |
| Premium | Enhanced calculators, educational analytics and dashboard features |
| Returns | No trading profits or financial returns promised |
| Activation | Disabled pending separate final pricing approval and confirmed provider eligibility |

The user approved building/testing this proposal, not activating live charging. The
offer is recorded in `lib/premium-offer.mjs` as PROPOSED, with an empty owner approval
reference. Product-level pricing approval, merchant eligibility, legal/security gates,
verified database/identity and genuine end-to-end testing are still required.

Public review page: `/pricing`. Billing shows the same versioned terms before checkout,
an unchecked acceptance box, renewal amount and cancellation/refund information. Basic
education and the handbook have not been paywalled. The API rejects stale or missing
acceptance. Provider terms consent is additionally required at Stripe checkout.

Cancellation control: customer selects Cancel subscription, reviews the paid-period
policy, then confirms. Stripe is updated with cancel_at_period_end=true and no proration.
Only canonical confirmation produces a no-further-renewals message; access is preserved
for the paid period. The cancellation endpoint remains usable with the new-live-sales
switch off, provided existing-billing credentials and infrastructure are available.

Refund information shown before checkout: cancellation does not itself refund a payment
already made. Customers can contact support with an invoice reference for billing errors
or refund requests; statutory rights including Australian Consumer Law are not excluded.
No blanket non-refundable term, invented guarantee or automatic refund entitlement was
added. Final documents, Australian entity/GST presentation and operational support must
be reviewed before sales. No extra tax or fee may silently change the proposed total.

`node scripts/configure-premium-product.mjs --show-proposal` is a read-only local review
command. It neither reads credentials nor calls Stripe. Importing an actual Stripe Price
requires secure provider configuration and only accepts the exact proposed monthly AUD
amount; the imported product remains disabled and does not assert approval.

SF Crypto Payments remains a separate system without a call path from this software
subscription. Existing recovered financial previews are not activated by this proposal.
