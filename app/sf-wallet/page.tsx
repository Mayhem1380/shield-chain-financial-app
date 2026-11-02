'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QrScanner from './qr-scanner';
import './sf-wallet.css';

type Snapshot = { balance: string; symbol: string; blockNumber: string; blockHash: string; verification: string; observedAt: string; stale: boolean };
type Address = { id: string; chainKey: string; publicAddress: string; label: string; snapshots: Snapshot[] };
type Transaction = { hash: string; timestamp: string; fromAddress: string; toAddress: string | null; nativeAmount: string; status: string; verification: string };
type Chain = { key: string; name: string; symbol: string; rpcConfigured: boolean };
type Portfolio = { addresses: Address[]; chains: Chain[]; exchanges: { id: string; provider: string; enabled: boolean; snapshots: { balances: Record<string, string>; observedAt: string }[] }[]; vault: { mode: string; custodyEnabled: boolean; credentialResolverConfigured: boolean } };

async function walletApi(path: string, data?: Record<string, unknown>) {
  const response = await fetch(`/api/sf-wallet/${path}`, { credentials: 'same-origin', cache: 'no-store', ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
  const payload = await response.json();
  if (!response.ok) {
    const errors: Record<string, string> = { AUTHENTICATION_REQUIRED: 'Sign in to your verified ShieldChain account to use SF Wallet.', RECENT_MFA_REQUIRED: 'Complete a fresh MFA check before this action.', PUBLIC_ADDRESS_CHECKSUM_INVALID: 'The address checksum is invalid. Verify it against the original source.', PUBLIC_ADDRESS_REQUIRED: 'Enter a supported public address only.', CHAIN_READ_PROVIDERS_NOT_CONFIGURED: 'Two approved blockchain read providers are not configured for this network.', CHAIN_PROVIDERS_DISAGREE: 'The blockchain providers disagree. No new balance was marked verified.', WALLET_RATE_LIMITED: 'Please wait a minute before trying again.', ADDRESS_VALIDATOR_NOT_INSTALLED: 'Address verification is not installed yet.', SF_WALLET_SERVICE_UNAVAILABLE: 'SF Wallet is unavailable. Account/database setup may still be required.' };
    throw new Error(errors[payload.error] || 'The read could not be verified. Existing snapshots have been retained; no funds moved.');
  }
  return payload;
}

export default function SfWalletPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [chainKey, setChainKey] = useState('ethereum'), [publicAddress, setPublicAddress] = useState(''), [label, setLabel] = useState('');
  const [selected, setSelected] = useState<Address | null>(null), [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [showQr, setShowQr] = useState<string | null>(null), [archiveId, setArchiveId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { setPortfolio(await walletApi('portfolio')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load SF Wallet.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const onScan = useCallback((value: { chainKey: string; address: string }) => { setChainKey(value.chainKey); setPublicAddress(value.address); }, []);

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await walletApi('addresses', { chainKey, publicAddress: publicAddress.trim(), label }); setPublicAddress(''); setLabel(''); setNotice('Public address tracked. Refresh it to request a corroborated blockchain snapshot.'); setPortfolio(await walletApi('portfolio')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to track address.'); }
    finally { setBusy(false); }
  }
  async function refresh(address: Address) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await walletApi('refresh', { addressId: address.id }); setNotice(`Balance corroborated at block ${result.snapshot.blockNumber}. ${result.verifiedTransactions} recent native transactions corroborated.${result.historyStatus !== 'CORROBORATED' ? ' History is incomplete; previous records remain available.' : ''}`); setPortfolio(await walletApi('portfolio')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to corroborate snapshot.'); }
    finally { setBusy(false); }
  }
  async function history(address: Address) {
    setBusy(true); setError('');
    try { const data = await walletApi(`history?addressId=${encodeURIComponent(address.id)}`); setSelected(address); setTransactions(data.transactions); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load history.'); }
    finally { setBusy(false); }
  }
  async function archive() {
    if (!archiveId) return; setBusy(true); setError('');
    try { await walletApi('archive', { addressId: archiveId }); setArchiveId(null); setSelected(null); setTransactions([]); setPortfolio(await walletApi('portfolio')); setNotice('Address removed from the active watchlist. Audit and historical records are retained.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove address.'); }
    finally { setBusy(false); }
  }
  async function exchange(connectionId: string) {
    setBusy(true); setError('');
    try { const result = await walletApi('exchanges/refresh', { connectionId }); if (result.error) throw new Error('Read-only exchange verification failed. No new balance was saved.'); setPortfolio(await walletApi('portfolio')); setNotice('Exchange-reported balances refreshed after a read-only permission check.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Exchange read unavailable.'); }
    finally { setBusy(false); }
  }

  return <main className="sfw-shell"><nav className="sfw-nav" aria-label="SF Wallet navigation"><Link className="sfw-brand" href="/">SF <span>SHIELDCHAIN FINANCIAL</span></Link><div><Link href="/dashboard">Platform</Link><Link href="/account/sessions">Account security</Link><Link href="/billing">Billing</Link></div></nav>
    <header className="sfw-hero"><div><p className="sfw-eyebrow">PUBLIC BLOCKCHAINS / PRIVATE ACCOUNT VIEW</p><h1>SF Wallet<span>Your assets. In view.</span></h1><p>A multi-chain public-address watchlist. Read blockchain data without importing keys or granting spending permissions.</p></div><div className="sfw-readonly"><span aria-hidden="true">◈</span> READ-ONLY<div>Signing, transfers and custody disabled</div></div></header>
    <div className="sfw-warning">Never enter a private key, password or recovery phrase. Tracking a public address does not prove ownership or give ShieldChain control of its funds.</div>
    {error && <p className="sfw-error" role="alert">{error}</p>}{notice && <p className="sfw-notice" role="status">{notice}</p>}
    <section className="sfw-stats" aria-label="Portfolio status"><article><span>Tracked public addresses</span><strong>{portfolio ? portfolio.addresses.length : '—'}</strong></article><article><span>Networks in your watchlist</span><strong>{portfolio ? new Set(portfolio.addresses.map(address => address.chainKey)).size : '—'}</strong></article><article><span>Corroborated snapshots</span><strong>{portfolio ? portfolio.addresses.filter(address => address.snapshots.length > 0).length : '—'}</strong></article><article><span>Fiat valuation</span><strong className="sfw-small">Not connected</strong><small>Native balances only · no invented market prices</small></article></section>
    <div className="sfw-grid"><section className="sfw-panel"><div className="sfw-heading"><h2>Multi-chain portfolio</h2><button type="button" disabled={busy} onClick={() => void load()}>Reload saved data</button></div><p>Ethereum, Base and Polygon. Balances are point-in-time native-asset reads, corroborated by two configured RPC providers at a finalized block.</p>
      {portfolio?.addresses.length === 0 && <div className="sfw-empty">No public addresses tracked yet. Add an address to begin. No wallet or balance is created for you.</div>}
      {portfolio?.addresses.map(address => { const snapshot = address.snapshots[0], chain = portfolio.chains.find(item => item.key === address.chainKey); return <article className="sfw-address" key={address.id}><div className="sfw-heading"><div><span className="sfw-chain">{chain?.name || address.chainKey}</span><h3>{address.label}</h3></div><strong className="sfw-balance">{snapshot ? `${snapshot.balance} ${snapshot.symbol}` : 'No verified snapshot'}</strong></div><code>{address.publicAddress}</code>{snapshot ? <p className={snapshot.stale ? 'sfw-stale' : 'sfw-proof'}>{snapshot.stale ? 'STALE SNAPSHOT' : 'CORROBORATED'} · block {snapshot.blockNumber}<br />Read {new Date(snapshot.observedAt).toLocaleString('en-AU')}<br /><small>Block hash: {snapshot.blockHash}</small></p> : <p>Balance verification has not completed.</p>}<div className="sfw-actions"><button type="button" disabled={busy || !chain?.rpcConfigured} onClick={() => void refresh(address)}>Verify blockchain data</button><button type="button" disabled={busy} onClick={() => void history(address)}>History & export</button><button type="button" onClick={() => setShowQr(showQr === address.id ? null : address.id)}>Public-address QR</button><button type="button" disabled={busy} onClick={() => setArchiveId(address.id)}>Remove tracking</button></div>{!chain?.rpcConfigured && <p className="sfw-stale">Approved read providers are not configured for this network.</p>}{showQr === address.id && <div className="sfw-qr"><Image unoptimized src={`/api/sf-wallet/qr?addressId=${encodeURIComponent(address.id)}`} width={220} height={220} alt={`Public-address QR for ${address.label}`} /><p>Public address only. Verify the network and full address independently.</p></div>}</article>; })}
    </section><aside className="sfw-panel"><h2>Track a public address</h2><form onSubmit={event => void track(event)}><label>Network<select value={chainKey} onChange={event => setChainKey(event.target.value)}><option value="ethereum">Ethereum</option><option value="base">Base</option><option value="polygon">Polygon</option></select></label><label>Public address<input required autoComplete="off" spellCheck={false} maxLength={42} placeholder="0x… public address only" value={publicAddress} onChange={event => setPublicAddress(event.target.value)} /></label><label>Your label<input required maxLength={60} autoComplete="off" value={label} onChange={event => setLabel(event.target.value)} /></label><button type="submit" className="sfw-primary" disabled={busy || !portfolio}>Track address</button></form><QrScanner selectedChain={chainKey} onAddress={onScan} /></aside></div>
    {archiveId && <section className="sfw-panel" role="group" aria-label="Confirm removing tracking"><h2>Remove this address from your watchlist?</h2><p>No blockchain action occurs. Historical/audit records are retained. Recent MFA is required.</p><button type="button" disabled={busy} onClick={() => void archive()}>Confirm removal</button><button type="button" onClick={() => setArchiveId(null)}>Keep tracking</button></section>}
    {selected && <section className="sfw-panel"><div className="sfw-heading"><h2>Verified transaction history — {selected.label}</h2><a className="sfw-button" href={`/api/sf-wallet/export?addressId=${encodeURIComponent(selected.id)}`}>Export CSV</a></div><p>Recent external native transactions only; token transfers and internal calls are not included. Refresh inspects up to 10 recent candidates; exports contain up to 1,000 stored corroborated records.</p><div className="sfw-table-wrap"><table><thead><tr><th>Transaction</th><th>Time</th><th>Native amount</th><th>Status</th><th>Verification</th></tr></thead><tbody>{transactions.map(transaction => <tr key={transaction.hash}><td><code>{transaction.hash}</code></td><td>{new Date(transaction.timestamp).toLocaleString('en-AU')}</td><td>{transaction.nativeAmount}</td><td>{transaction.status}</td><td>{transaction.verification}</td></tr>)}</tbody></table>{transactions.length === 0 && <p>No corroborated transaction records have been saved for this address.</p>}</div></section>}
    <div className="sfw-grid"><section className="sfw-panel"><h2>Read-only exchange views</h2><p>Only externally vaulted, reviewed read-only API connections can be used. No API secrets are accepted by this page.</p>{portfolio?.exchanges.length === 0 && <p>No approved exchange connection is configured.</p>}{portfolio?.exchanges.map(connection => <article key={connection.id}><h3>{connection.provider}</h3><button type="button" disabled={busy || !connection.enabled || !portfolio.vault.credentialResolverConfigured} onClick={() => void exchange(connection.id)}>Refresh read-only balances</button>{connection.snapshots[0] && <><p>Exchange-reported · {new Date(connection.snapshots[0].observedAt).toLocaleString('en-AU')}</p><dl>{Object.entries(connection.snapshots[0].balances).map(([asset, amount]) => <div key={asset}><dt>{asset}</dt><dd>{amount}</dd></div>)}</dl></>}</article>)}</section><section className="sfw-panel sfw-vault"><p className="sfw-eyebrow">SF CUSTOMER VAULT</p><h2>Metadata, not custody.</h2><p>Your account-scoped vault architecture stores watchlist metadata and references to an approved external credential vault. It does not store wallet private keys, recovery phrases or exchange secrets.</p><ul><li>Account and ownership checks on every request</li><li>Provider permission verification before exchange reads</li><li>Audited tracking, refresh, export and archive actions</li><li>Key import, transfers, withdrawals and sweeping disabled</li></ul></section></div>
    <footer className="sfw-footer">SF Wallet · Read-only monitoring · Data can be stale or unavailable · No investment returns promised<Link href="/handbook">Free Beginner Handbook</Link></footer>
  </main>;
}
