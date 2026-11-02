'use client';

import { useState } from 'react';
import Link from 'next/link';

type WorkspaceKind = 'exchange' | 'wallet' | 'challenges';
const market = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67420, change: '+2.4%', mark: '₿' },
  { symbol: 'ETH', name: 'Ethereum', price: 3482.6, change: '+1.1%', mark: '◆' },
  { symbol: 'USDC', name: 'USD Coin', price: 1, change: '0.0%', mark: '$' },
  { symbol: 'USDT', name: 'Tether', price: 1, change: '0.0%', mark: '₮' },
  { symbol: 'SOL', name: 'Solana', price: 150, change: '+0.8%', mark: '◎' },
];
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function PreviewWorkspace({ kind }: { kind: WorkspaceKind }) {
  const [asset, setAsset] = useState('BTC');
  const [amount, setAmount] = useState('100');
  const [fromAsset, setFromAsset] = useState('USDT');
  const [toAsset, setToAsset] = useState('BTC');
  const [feePercent, setFeePercent] = useState('0.35');
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState('');
  const quantity = Number(amount);
  const fromPrice = market.find((item) => item.symbol === fromAsset)?.price ?? 1;
  const toPrice = market.find((item) => item.symbol === toAsset)?.price ?? 1;
  const swapValueUsd = Number.isFinite(quantity) && quantity > 0 ? quantity * fromPrice : 0;
  const swapFeeUsd = swapValueUsd * (Number(feePercent) / 100);
  const swapNetUsd = Math.max(0, swapValueUsd - swapFeeUsd);
  const swapReceived = fromAsset === toAsset ? 0 : swapNetUsd / toPrice;
  const compactNumber = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 8 });
  const title = kind === 'exchange' ? 'Exchange preview' : kind === 'wallet' ? 'Wallet centre' : 'Challenge simulator';
  const subtitle = kind === 'exchange' ? 'Preview crypto-to-crypto swap fees and estimated amounts—without placing a transaction.' : kind === 'wallet' ? 'Learn about supported assets and wallet safety before any provider is selected.' : 'Understand the structure of a simulated trading challenge.';

  return <main className="workspace-page">
    <header className="workspace-header"><div><div className="eyebrow">SHIELDCHAIN FINANCIAL / PRIVATE BETA PREPARATION</div><h1>{title}</h1><p>{subtitle}</p></div><Link className="button button-quiet" href="/dashboard">← Dashboard</Link></header>
    <div className="notice"><span>ⓘ</span><p><strong>Preview environment only.</strong> No accounts, orders, balances, wallet addresses, deposits or withdrawals are connected. Figures are illustrative and are not live market data.</p></div>

    {kind === 'exchange' && <>
      <section className="workspace-grid"><article className="dash-panel"><div className="panel-heading"><div><h2>Market watch</h2><p>Fictional sample figures · not quotes</p></div><span className="sample-pill">NOT LIVE</span></div><div className="asset-table">{market.map((item) => <button className={`market-pick ${asset === item.symbol ? 'market-pick-active' : ''}`} key={item.symbol} onClick={() => { setAsset(item.symbol); setFromAsset(item.symbol); setPreview(false); setNotice(''); }}><span className="asset-name"><i>{item.mark}</i><span><strong>{item.name}</strong><small>{item.symbol}</small></span></span><strong>{money(item.price)}</strong><span className="green">{item.change}</span></button>)}</div><p className="fine-print">All prices are hard-coded demonstration values, not current market data.</p></article>
      <article className="dash-panel"><div className="panel-heading"><div><h2>Crypto swap preview</h2><p>See the estimated fee and receive amount.</p></div><span className="challenge-icon">⇄</span></div>
      <label className="field-label" htmlFor="swap-amount">Amount to swap</label><input id="swap-amount" className="field-control" type="number" min="0.000001" max="100000000" step="any" value={amount} onChange={(e) => { setAmount(e.target.value); setPreview(false); }} />
      <div className="swap-form-row"><div><label className="field-label" htmlFor="swap-from">You pay</label><select id="swap-from" className="field-control" value={fromAsset} onChange={(e) => { setFromAsset(e.target.value); setPreview(false); }}><option value="BTC">BTC · Bitcoin</option><option value="ETH">ETH · Ethereum</option><option value="USDT">USDT · Tether</option><option value="USDC">USDC · USD Coin</option><option value="SOL">SOL · Solana</option></select></div><span className="swap-direction" aria-hidden="true">→</span><div><label className="field-label" htmlFor="swap-to">You receive</label><select id="swap-to" className="field-control" value={toAsset} onChange={(e) => { setToAsset(e.target.value); setPreview(false); }}><option value="BTC">BTC · Bitcoin</option><option value="ETH">ETH · Ethereum</option><option value="USDT">USDT · Tether</option><option value="USDC">USDC · USD Coin</option><option value="SOL">SOL · Solana</option></select></div></div>
      <label className="field-label" htmlFor="swap-fee">Illustrative ShieldChain fee</label><select id="swap-fee" className="field-control" value={feePercent} onChange={(e) => { setFeePercent(e.target.value); setPreview(false); }}><option value="0.35">0.35% · proposed starting point</option><option value="0.25">0.25% · lower-fee example</option><option value="0.50">0.50% · higher-fee example</option></select>
      <p className="fine-print">Example platform fee only. Provider/liquidity costs, network fees, spread, slippage and price movement are not included. We will set live fees only after receiving provider quotes and completing legal/compliance review.</p><button className="button button-primary full-button" onClick={() => { setNotice(''); setPreview(true); }}>Calculate demo quote</button>
      {preview && <div className="calculation-result swap-result" role="status"><strong>DEMO QUOTE · NOT EXECUTABLE</strong><b>{fromAsset === toAsset ? 'Choose two different assets' : `${compactNumber(swapReceived)} ${toAsset}`}</b><div className="swap-breakdown"><span>Input value (sample USD)</span><strong>{money(swapValueUsd)}</strong><span>ShieldChain fee ({feePercent}%)</span><strong>{money(swapFeeUsd)}</strong><span>Value after platform fee</span><strong>{money(swapNetUsd)}</strong><span>Sample rate</span><strong>1 {fromAsset} ≈ {compactNumber(fromPrice / toPrice)} {toAsset}</strong></div><small>Sample rates only. No wallet is connected and no assets move. A live quote must show all provider, network and route costs, expiry and final receive amount before confirmation.</small></div>}</article></section>
    </>}

    {kind === 'wallet' && <>
      <section className="workspace-grid"><article className="dash-panel"><div className="panel-heading"><div><h2>Asset education</h2><p>Asset availability depends on future provider and network approval.</p></div><span className="sample-pill">NOT CONNECTED</span></div>{market.map((item) => <div className="wallet-asset" key={item.symbol}><span className="asset-name"><i>{item.mark}</i><span><strong>{item.name}</strong><small>{item.symbol}</small></span></span><span className="wallet-state">Planned for review</span></div>)}</article><article className="dash-panel"><div className="panel-heading"><div><h2>Before using a wallet</h2><p>Essential safety principles</p></div><span className="challenge-icon">⌑</span></div><div className="challenge-row"><span>Confirm the exact network</span><strong>Required</strong></div><div className="challenge-row"><span>Test deposit / withdrawal flow</span><strong>Required</strong></div><div className="challenge-row"><span>Custody provider review</span><strong>Pending</strong></div><div className="challenge-row"><span>Recovery and incident plan</span><strong>Pending</strong></div><p className="fine-print">Never share a seed phrase or private key with support staff, a website or an AI assistant. This demo does not generate or display wallet secrets.</p></article></section>
      <div className="admin-warning">Wallet functions are intentionally disabled. No deposit address exists in this demo. Live custody must not be enabled until provider terms, legal requirements, key controls and independent security testing are approved.</div>
    </>}

    {kind === 'challenges' && <>
      <section className="workspace-grid"><article className="dash-panel"><div className="panel-heading"><div><h2>Illustrative challenge rules</h2><p>Example settings only; not approved product terms.</p></div><span className="sample-pill">SIMULATED</span></div><div className="challenge-row"><span>Starting simulated balance</span><strong>$100,000</strong></div><div className="challenge-row"><span>Example profit target</span><strong>8%</strong></div><div className="challenge-row"><span>Example daily loss limit</span><strong>5%</strong></div><div className="challenge-row"><span>Example overall loss limit</span><strong>10%</strong></div><div className="challenge-row"><span>Minimum trading days</span><strong>5</strong></div><p className="fine-print">These figures are placeholders to demonstrate presentation only. Challenge rules, fees, eligibility and any reward structure require documented approval before launch.</p></article><article className="dash-panel"><div className="panel-heading"><div><h2>Progress calculator</h2><p>Change the sample result to see progress.</p></div></div><ChallengeProgress /></article></section>
    </>}

    {notice && <p className="workspace-message" role="status">{notice}</p>}
    <footer className="dash-footer">ShieldChain Financial · Private beta preparation · No real financial activity enabled</footer>
  </main>;
}

function ChallengeProgress() {
  const [profit, setProfit] = useState('1245.80');
  const value = Number(profit);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100000;
  const progress = valid ? Math.min(100, (value / 8000) * 100) : 0;
  return <><label className="field-label" htmlFor="demo-profit">Sample profit / loss (USD)</label><input className="field-control" id="demo-profit" type="number" min="0" max="100000" value={profit} onChange={(e) => setProfit(e.target.value)} />{valid ? <><div className="progress large-progress"><i style={{ width: `${progress}%` }} /></div><div className="challenge-row"><span>Example target progress</span><strong>{progress.toFixed(1)}%</strong></div><div className="challenge-row"><span>Remaining to example target</span><strong>{money(Math.max(0, 8000 - value))}</strong></div><p className="fine-print">Assumes an illustrative $100,000 starting balance and an $8,000 target. This is a simple display calculator, not a risk or eligibility decision.</p></> : <p className="field-error">Enter a sample value from $0 to $100,000.</p>}</>;
}
