'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import '../sf-wallet/sf-wallet.css';
type Plan={id:string;principalAsset:string;rewardAsset:string;state:string};
type Observation={id:string;day:string;currentValueAud:string;principalPriceAud:string;rewardPriceAud:string;indicativeRewardAud:string;indicativeRewardUnits:string;status:string};
type History={plan:Plan&{principalUnits:string;annualRatePercent:string};observations:Observation[]};
async function api(planId?:string){
  const r=await fetch(`/api/customer/locked-earn${planId?`?planId=${encodeURIComponent(planId)}`:''}`,{cache:'no-store',credentials:'same-origin'});const data=await r.json();
  if(!r.ok)throw new Error(`Review records unavailable (${data.error||r.status}). Verified sign-in and database setup are required.`);return data;
}
export default function LockedEarnReview(){
  const [plans,setPlans]=useState<Plan[]|null>(null),[history,setHistory]=useState<History|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{setPlans((await api()).plans);},[]);useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
  async function open(id:string){setBusy(true);setError('');try{setHistory(await api(id));}catch(e){setError(e instanceof Error?e.message:'Review unavailable.');}finally{setBusy(false);}}
  return <main className="sfw-shell"><nav className="sfw-nav" aria-label="Locked Earn review navigation"><Link className="sfw-brand" href="/">SF <span>LOCKED EARN REVIEW</span></Link><div><Link href="/calculators">Calculation tools</Link><Link href="/customer-support">Support tickets</Link></div></nav><header className="sfw-hero"><div><p className="sfw-eyebrow">PROPOSED MODEL / NO LIVE PRODUCT</p><h1>Current value.<span>Daily evidence.</span></h1><p>Account-scoped engineering observations of the proposed daily current-market-value reward model. These records create no deposit, entitlement, payable reward or withdrawable balance.</p></div></header><p className="sfw-warning">No guaranteed returns. No product rate is approved. Prices, liquidity, custody and counterparties carry risk; capital may be lost. Live deposits, payable accrual and payouts are disabled.</p>{error&&<p role="alert" className="sfw-error">{error}</p>}
    <section className="sfw-panel"><h2>Your review plans</h2>{plans?.length===0&&<p>No review plans have been provisioned for your account. No deposit or reward balance has been created.</p>}{plans?.map(p=><article key={p.id}><h3>{p.principalAsset} → {p.rewardAsset}</h3><p>{p.state}</p><button disabled={busy} onClick={()=>void open(p.id)}>Review daily records</button></article>)}</section>
    {history&&<section className="sfw-panel"><h2>Daily non-payable observations</h2><p>Principal assumption: {history.plan.principalUnits} {history.plan.principalAsset}. Annual rate assumption: {history.plan.annualRatePercent}%, not an offer. Daily simple calculation uses closing AUD prices and ACT/365 without compounding.</p><div className="sfw-table-wrap"><table><thead><tr><th>UTC day</th><th>Principal price AUD</th><th>Reward price AUD</th><th>Principal value AUD</th><th>Indicative reward AUD</th><th>Indicative reward units</th><th>Record status</th></tr></thead><tbody>{history.observations.map(o=><tr key={o.id}><td>{o.day.slice(0,10)}</td><td>{o.principalPriceAud}</td><td>{o.rewardPriceAud}</td><td>{o.currentValueAud}</td><td>{o.indicativeRewardAud}</td><td>{o.indicativeRewardUnits}</td><td>{o.status}</td></tr>)}</tbody></table></div>{history.observations.length===0&&<p>No corroborated daily observations have been recorded. Missing days do not mean zero rewards or zero prices.</p>}<p>Latest 366 stored observations. Rounding is downward to 18 decimals; actual product settlement precision and terms remain undecided. These are engineering records, not tax statements or an investment account.</p></section>}
  </main>;
}
