'use client';

import { useState, type FormEvent } from 'react';

type Result = { amount: number; fee: number; marketLoss: number; remaining: number };
const money = (value: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

export default function PremiumTools() {
  const [amount, setAmount] = useState('');
  const [downside, setDownside] = useState('');
  const [fee, setFee] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setResult(null); setBusy(true);
    try {
      const response = await fetch('/api/premium/risk-calculator', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(amount), downsidePercent: Number(downside), feePercent: Number(fee) }) });
      if (!response.ok) throw new Error(response.status === 403 ? 'Premium access is not currently confirmed. Check billing.' : 'Unable to calculate. Check your inputs and try again.');
      setResult(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to calculate.'); }
    finally { setBusy(false); }
  }
  return <section className="dash-panel"><h2>Downside and fee calculator</h2><p>Enter your own assumptions. Results are hypothetical calculations, not investment advice or live market quotes.</p><form onSubmit={event => void calculate(event)}><label>Amount in AUD<input required type="number" min="0.01" max="100000000" step="any" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>Hypothetical downside (%)<input required type="number" min="0" max="100" step="any" value={downside} onChange={event => setDownside(event.target.value)} /></label><label>Fee assumption (%)<input required type="number" min="0" max="100" step="any" value={fee} onChange={event => setFee(event.target.value)} /></label><button className="button" type="submit" disabled={busy}>{busy ? 'Calculating…' : 'Calculate'}</button></form>{error && <p role="alert">{error}</p>}{result && <div role="status"><h3>Calculation results</h3><p>Starting amount: {money(result.amount)}</p><p>Fee impact: {money(result.fee)}</p><p>Market downside: {money(result.marketLoss)}</p><p>Remaining after these assumptions: {money(result.remaining)}</p></div>}</section>;
}
