import Link from 'next/link';
import { PREMIUM_TERMS } from '@/lib/premium-offer.mjs';

export default function PremiumTerms() {
  return <section className="dash-panel" aria-labelledby="premium-subscription-terms"><h2 id="premium-subscription-terms">Premium subscription terms</h2><p><strong>{PREMIUM_TERMS.pricing}</strong></p><p>{PREMIUM_TERMS.renewal}</p><h3>Cancellation</h3><p>{PREMIUM_TERMS.cancellation}</p><h3>Refund information</h3><p>{PREMIUM_TERMS.refunds} <Link href="/support">Contact support</Link></p><h3>What Premium includes</h3><p>{PREMIUM_TERMS.scope}</p><p>{PREMIUM_TERMS.free} <Link href="/handbook">Read the free Beginner Handbook</Link> · <Link href="/risk-lab">Basic educational calculator</Link></p><p role="note">{PREMIUM_TERMS.availability}</p></section>;
}
