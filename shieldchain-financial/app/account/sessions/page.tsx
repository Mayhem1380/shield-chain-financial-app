'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Session = { id: string; createdAt: string; expiresAt: string; lastSeenAt: string | null; current: boolean };
async function authApi(path: string, method = 'GET') {
  const response = await fetch(`/api/auth/${path}`, { method, credentials: 'same-origin', cache: 'no-store', ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}) });
  const data = await response.json();
  if (!response.ok) {
    if (data.error === 'AUTHENTICATION_REQUIRED') throw new Error('A verified signed-in account is required.');
    if (data.error === 'RECENT_MFA_REQUIRED') throw new Error('Complete a fresh multifactor authentication check before ending all sessions.');
    if (data.error === 'AUTH_RATE_LIMITED') throw new Error('Please wait a minute before trying again.');
    throw new Error('Session management is unavailable. Server-side revocation has not been confirmed.');
  }
  return data;
}

export default function AccountSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [current, list] = await Promise.all([authApi('session'), authApi('sessions')]);
      setAuthenticated(current.authenticated === true); setSessions(list.sessions);
    } catch (e) { setAuthenticated(false); setSessions([]); setError(e instanceof Error ? e.message : 'Unable to verify sessions.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function endSessions(all: boolean) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await authApi(all ? 'sessions/revoke-all' : 'logout', 'POST');
      if (result.loggedOut !== true) throw new Error('Server-side sign-out has not been confirmed.');
      setAuthenticated(false); setSessions([]); setConfirmAll(false);
      setNotice(all ? 'Your currently stored ShieldChain sessions have been revoked.' : 'Signed out of ShieldChain on this device.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to confirm sign-out.'); }
    finally { setBusy(false); }
  }

  return <main className="workspace-page"><header className="workspace-header"><div><h1>Account sessions</h1><p>Review and end your authenticated ShieldChain sessions.</p></div><Link href="/account">Account</Link></header>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button type="button" className="button" disabled={busy} onClick={() => void refresh()}>{busy ? 'Checking…' : 'Refresh sessions'}</button>
    {authenticated && <><button type="button" className="button" disabled={busy} onClick={() => void endSessions(false)}>Sign out this device</button><button type="button" className="button" disabled={busy} onClick={() => setConfirmAll(true)}>End all ShieldChain sessions</button></>}
    {confirmAll && <section className="dash-panel" aria-label="Confirm ending all sessions"><p>This ends your currently stored ShieldChain sessions, including this one. A recent MFA check is required.</p><button type="button" disabled={busy} onClick={() => void endSessions(true)}>Confirm ending all sessions</button><button type="button" disabled={busy} onClick={() => setConfirmAll(false)}>Keep sessions</button></section>}
    <section aria-label="Active sessions" aria-busy={busy}>{sessions.map(session => <article className="dash-panel" key={session.id}><h2>{session.current ? 'Current session' : 'Other active session'}</h2><p>Started: {new Date(session.createdAt).toLocaleString('en-AU')}</p><p>Expires: {new Date(session.expiresAt).toLocaleString('en-AU')}</p>{session.lastSeenAt && <p>Last seen: {new Date(session.lastSeenAt).toLocaleString('en-AU')}</p>}</article>)}</section>
    <p>This manages ShieldChain sessions. Your identity provider may retain its own sign-in session.</p><Link href="/billing">Billing and subscription</Link>
  </main>;
}
