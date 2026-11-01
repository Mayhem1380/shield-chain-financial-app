// Owner-proposed pricing. This is not final pricing or permission to charge live funds.
export const PREMIUM_OFFER = Object.freeze({
  code: 'SF_PREMIUM_SOFTWARE_ACCESS',
  title: 'ShieldChain Financial Premium Software Access',
  currency: 'aud',
  amountMinor: 995,
  interval: 'month',
  intervalCount: 1,
  pricingStatus: 'PROPOSED',
  ownerPricingApprovalReference: null,
  termsVersion: 'sf-premium-995-monthly-proposal-v1',
  cancellation: 'END_OF_PAID_PERIOD',
});

export const PREMIUM_TERMS = Object.freeze({
  pricing: 'Proposed subscription price: AUD $9.95 per month, billed monthly.',
  renewal: 'The subscription renews automatically at AUD $9.95 each month until you cancel. Review the confirmed price before paying.',
  cancellation: 'Cancel in Billing before your next renewal. Once cancellation is confirmed, no further renewals will be charged. Cancellation takes effect at the end of your current paid billing period, and you retain access until that date.',
  refunds: 'Cancellation does not itself refund a payment already made. For a billing error or refund request, contact support with your invoice reference. Requests are reviewed under applicable law, including Australian Consumer Law. Your statutory rights are not excluded.',
  scope: 'Premium includes enhanced calculators, educational analytics and dashboard features. These are educational software tools, not a promise of trading profits or financial returns.',
  free: 'The Beginner Handbook and basic educational features remain free. No subscription is required for them.',
  availability: 'Pricing is proposed and checkout is not open for live charging. Final pricing approval and confirmation of merchant account and product eligibility are still required.',
});

export function matchesPremiumProposal(value) {
  return value?.currency === PREMIUM_OFFER.currency && value?.amountMinor === PREMIUM_OFFER.amountMinor && value?.interval === PREMIUM_OFFER.interval && value?.intervalCount === PREMIUM_OFFER.intervalCount;
}
