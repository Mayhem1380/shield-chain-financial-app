'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { lockedEarnScenario, collateralLoanScenario } from '@/lib/financial-calculators.mjs';
import '../sf-wallet/sf-wallet.css';

type Result = { values: [string, string][]; warning: string };
export default function FinancialCalculators() {
  const [earn, setEarn] = useState<Result | null>(null), [loan, setLoan] = useState<Result | null>(null);
  const [earnError, setEarnError] = useState(''), [loanError, setLoanError] = useState('');
  function calculate(event: FormEvent<HTMLFormElement>, mode: 'earn' | 'loan') {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const field = (key: string) => String(form.get(key) || '').trim();
    try {
      if (mode === 'earn') {
        setEarnError(''); setEarn(null);
        const r = lockedEarnScenario({ principalUnits: field('units'), currentPriceAud: field('price'), rewardPriceAud: field('rewardPrice'), annualRatePercent: field('rate'), days: Number(field('days')) });
        setEarn({ values: [['Current assumed principal value (AUD)', r.currentValueAud], ['Indicative interval reward value (AUD)', r.indicativeRewardAud], ['Indicative reward-asset units', r.indicativeRewardUnits]], warning: r.warning });
      } else {
        setLoanError(''); setLoan(null);
        const r = collateralLoanScenario({ collateralUnits: field('units'), currentPriceAud: field('price'), debtAud: field('debt'), liquidationLtvPercent: field('threshold'), stressDropPercent: field('drop') });
        setLoan({ values: [['Collateral value (AUD)', r.collateralValueAud], ['Current LTV (%)', r.ltvPercent], ['Threshold price per unit (AUD)', r.liquidationPriceAud], ['Stressed collateral (AUD)', r.stressedCollateralValueAud], ['Stressed LTV (%)', r.stressedLtvPercent ?? 'Unbounded: collateral value is zero'], ['Stressed shortfall (AUD)', r.shortfallAud], ['Threshold reached now', r.thresholdBreached ? 'Yes' : 'No'], ['Threshold reached under stress', r.stressedThresholdBreached ? 'Yes' : 'No']], warning: r.warning });
      }
    } catch { const message = 'Check all inputs. Use unsigned decimal numbers with at most 18 decimal places. Prices and units must be positive. No calculation or financial action was saved.'; if (mode === 'earn') setEarnError(message); else setLoanError(message); }
  }
  return <main className="sfw-shell"><nav className="sfw-nav" aria-label="Calculator navigation"><Link className="sfw-brand" href="/">SF <span>SHIELDCHAIN FINANCIAL</span></Link><div><Link href="/sf-wallet">SF Wallet</Link><Link href="/risk-lab">Risk lab</Link><Link href="/handbook">Free handbook</Link></div></nav>
    <header className="sfw-hero"><div><p className="sfw-eyebrow">EDUCATIONAL CALCULATIONS</p><h1>Price changes.<span>Risk changes with it.</span></h1><p>Explore current-value reward assumptions and collateral risk. Enter your own assumptions; no prices, reward rates or credit terms are supplied or approved here.</p></div></header>
    <p className="sfw-warning">These free basic tools perform local calculations only. No funds are accepted, rewards accrued, loans offered or orders executed. Results are not financial advice or promised returns.</p>
    <div className="sfw-grid"><section className="sfw-panel"><h2>SF Locked Earn — proposed calculation</h2><p>For each interval: principal units × current AUD price × assumed annual rate × days ÷ 365. Reward-asset units use that asset’s current AUD price. Reprice each interval; this is simple interest with no compounding.</p>
      <form onSubmit={event => calculate(event, 'earn')} onChange={() => { setEarn(null); setEarnError(''); }}>
        <label>Principal crypto units<input name="units" required inputMode="decimal" autoComplete="off" /></label>
        <label>Current assumed principal price (AUD per unit)<input name="price" required inputMode="decimal" autoComplete="off" /></label>
        <label>Current assumed reward-asset price (AUD per unit)<input name="rewardPrice" required inputMode="decimal" autoComplete="off" /></label>
        <label>Assumed annual rate (0–100%, not an offered rate)<input name="rate" required inputMode="decimal" autoComplete="off" /></label>
        <label>Interval days (1–366)<input name="days" required type="number" min="1" max="366" step="1" /></label>
        <button className="sfw-primary" type="submit">Calculate proposed reward scenario</button>
      </form>{earnError && <p className="sfw-error" role="alert">{earnError}</p>}{earn && <div aria-live="polite"><dl>{earn.values.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><p className="sfw-warning">{earn.warning}</p></div>}
      <p>No rate or product eligibility has been approved. Capital, counterparty, custody, liquidity and price risk may cause losses. A lock may prevent access when needed. Calculated reward units are rounded down at 18 decimals; actual asset precision and payout terms remain undecided.</p>
    </section><section className="sfw-panel"><h2>Crypto-backed loan risk</h2><p>Compare debt against the assumed current and stressed collateral value. Threshold price excludes interest and liquidation execution costs.</p>
      <form onSubmit={event => calculate(event, 'loan')} onChange={() => { setLoan(null); setLoanError(''); }}>
        <label>Collateral crypto units<input name="units" required inputMode="decimal" autoComplete="off" /></label>
        <label>Current assumed collateral price (AUD per unit)<input name="price" required inputMode="decimal" autoComplete="off" /></label>
        <label>Total assumed debt (AUD)<input name="debt" required inputMode="decimal" autoComplete="off" /></label>
        <label>Assumed liquidation LTV (greater than 0 and below 100%)<input name="threshold" required inputMode="decimal" autoComplete="off" /></label>
        <label>Stress price decline (0–100%)<input name="drop" required inputMode="decimal" autoComplete="off" /></label>
        <button className="sfw-primary" type="submit">Calculate collateral risk</button>
      </form>{loanError && <p className="sfw-error" role="alert">{loanError}</p>}{loan && <div aria-live="polite"><dl>{loan.values.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><p className="sfw-warning">{loan.warning}</p></div>}
      <p>Positive shortfall means assumed debt exceeds the stressed collateral value. Even a result below the assumed threshold is not a safety guarantee. No loan application, collateral transfer or liquidation is enabled.</p>
    </section></div><footer className="sfw-footer">User-supplied prices are not verified market data. Results stay in this page and are not a financial account record.<Link href="/premium">Premium software terms</Link></footer>
  </main>;
}
