import { headers } from 'next/headers';
import Link from 'next/link';
import { requirePremiumAccess } from '@/lib/payments/premium-runtime.mjs';
import PremiumTools from './tools';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PremiumPage() {
  try {
    const request = new Request('https://shieldchain.invalid/premium', { headers: new Headers(await headers()) });
    const access = await requirePremiumAccess(request);
    return <main className="workspace-page"><h1>ShieldChain Financial Premium Software Access</h1><section className="dash-panel"><h2>Premium dashboard</h2><p>Verified access through {new Date(access.accessUntil!).toLocaleString('en-AU')}.</p><p>Included features: {access.features.join(', ').replaceAll('-', ' ')}.</p><Link href="/billing">Manage subscription, invoices and receipts</Link></section><p>Educational tools and calculations. No trades, custody services or financial transactions are performed here.</p><section className="dash-panel"><h2>Understanding downside and fees</h2><p>A percentage loss applies to the starting amount. A separate percentage fee adds a cost. The calculator below combines those assumptions and floors the remaining amount at zero.</p><p>This simplified model omits spreads, slippage, tax, leverage and changing liquidity. Enter assumptions you understand and compare several scenarios. A calculation does not forecast returns or recommend a purchase.</p></section><PremiumTools /></main>;
  } catch {
    return <main className="workspace-page"><h1>Premium Software Access</h1><p>A verified customer account and a confirmed paid subscription are required. If you have just paid, check billing for the latest confirmation.</p><Link href="/billing">View billing and subscription</Link></main>;
  }
}
