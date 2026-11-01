'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const money = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(value);

export default function RiskLabPage() {
  const [amount, setAmount] = useState(1000);
  const [drop, setDrop] = useState(20);
  const [fee, setFee] = useState(0.5);
  const result = useMemo(() => {
    const validAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const validDrop = Number.isFinite(drop) ? Math.min(100, Math.max(0, drop)) : 0;
    const validFee = Number.isFinite(fee) ? Math.min(10, Math.max(0, fee)) : 0;
    const estimatedFee = validAmount * validFee / 100;
    const marketLoss = validAmount * validDrop / 100;
    return { amount: validAmount, estimatedFee, marketLoss, totalImpact: Math.min(validAmount, marketLoss + estimatedFee), remaining: Math.max(0, validAmount - marketLoss - estimatedFee) };
  }, [amount, drop, fee]);

  return <main className="risk-lab-page">
    <header className="risk-lab-header"><Link className="account-back" href="/">← ShieldChain Financial</Link><div className="eyebrow">SF LEARNING TOOLS / 01</div><h1>Understand the <em>downside.</em></h1><p>A simple, hypothetical calculator to explore how a market fall and an example fee could affect an amount. No live prices, trade execution or recommendations.</p><span className="risk-lab-badge">SIMULATION ONLY · AUD</span></header>
    <section className="risk-lab-grid" aria-label="Hypothetical risk calculator">
      <div className="risk-lab-controls">
        <div className="economics-section-heading">SCENARIO INPUTS <small>Change the values</small></div>
        <label className="economics-field"><span>Hypothetical amount <b>{money(amount)}</b></span><input aria-label="Hypothetical amount in Australian dollars" type="range" min="100" max="50000" step="100" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><small>Illustrative starting amount, not a deposit or balance.</small></label>
        <label className="economics-field"><span>Market decline <b>{drop}%</b></span><input aria-label="Hypothetical market decline percentage" type="range" min="0" max="100" step="1" value={drop} onChange={e=>setDrop(Number(e.target.value))}/><small>Tests a fall from 0% to 100%. Actual movements can be sudden and larger than expected.</small></label>
        <label className="economics-field"><span>Example fee rate <b>{fee.toFixed(2)}%</b></span><input aria-label="Example fee rate percentage" type="range" min="0" max="10" step="0.1" value={fee} onChange={e=>setFee(Number(e.target.value))}/><small>Placeholder only. Real fees may include spread, network costs, slippage and other charges.</small></label>
        <button className="button button-quiet risk-reset" type="button" onClick={()=>{setAmount(1000);setDrop(20);setFee(0.5)}}>Reset example</button>
      </div>
      <div className="risk-lab-results" aria-live="polite">
        <div className="risk-result-hero"><span>Estimated amount remaining</span><strong>{money(result.remaining)}</strong><small>After the hypothetical decline and example fee, before any other costs or effects.</small></div>
        <div className="economics-metrics"><article><span>Starting amount</span><strong>{money(result.amount)}</strong><small>Scenario input</small></article><article><span>Market decline impact</span><strong className="economics-negative">−{money(result.marketLoss)}</strong><small>{drop}% of starting amount</small></article><article><span>Example fee</span><strong>−{money(result.estimatedFee)}</strong><small>{fee.toFixed(2)}% of starting amount</small></article><article><span>Total estimated impact</span><strong className="economics-negative">−{money(result.totalImpact)}</strong><small>Loss plus example fee, capped at starting amount</small></article></div>
        <div className="risk-lab-disclaimer"><strong>What this does — and doesn’t — tell you</strong><p>This is arithmetic for education, not a forecast. It excludes taxes, funding costs, liquidation, price gaps, changing fees and other product-specific effects. It does not suggest that any asset is suitable for you or that losses can be limited to this estimate.</p></div>
      </div>
    </section>
    <section className="risk-lab-next"><div><div className="eyebrow">KEEP LEARNING</div><h2>Know the risks before the product.</h2><p>Build your understanding with the beginner’s guide, and check what the current preview can and cannot do.</p></div><div className="risk-lab-links"><Link href="/handbook">Beginner’s handbook ↗</Link><Link href="/transparency">Transparency centre ↗</Link><Link href="/status">Service status ↗</Link></div></section>
    <footer className="economics-footer">SHIELDCHAIN FINANCIAL · EDUCATIONAL SIMULATION · NOT FINANCIAL ADVICE</footer>
  </main>;
}
