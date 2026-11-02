# Owner pricing approval and separate activation lock

The owner explicitly confirmed: “ShieldChain Financial Premium Software Access is
officially priced at AUD $9.95 per month, billed monthly. Cancellation takes effect
at the end of the paid billing period.”

Internal reference `OWNER_CHAT_FINAL_PRICE_2026-11-01` identifies that instruction in
this conversation. It is not a Stripe approval, licence, security review or external
provider reference. It was assigned locally for audit traceability.

`lib/premium-offer.mjs` now records pricingStatus APPROVED and the approved AUD 995
minor-unit monthly amount. The amount remains centrally configurable through a reviewed
source change; no provider Price was created or changed. Existing source and e781312
are preserved as ancestors.

Activation remains NOT_AUTHORISED with no owner activation reference. New live Premium
checkout fails even when pricing is approved or live environment switches are enabled.
Merchant account/product eligibility, build/database/security checks, genuine authorised
payment evidence and separate owner activation approval remain outstanding. Free handbook
and basic education remain available; SF Crypto Payments remains separate.
