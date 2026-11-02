'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import '../sf-wallet/sf-wallet.css';
type Ticket = { id: string; reference: string; subject: string; status: string; category: string };
type Message = { id: string; body: string; authorType: string; createdAt: string };
type Notice = { id: string; resourceId: string; readAt: string | null; createdAt: string };
async function api(path: string, body?: Record<string, unknown>) {
  const response = await fetch(`/api/customer/${path}`, { cache: 'no-store', credentials: 'same-origin', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error === 'AUTHENTICATION_REQUIRED' ? 'Sign in with your verified ShieldChain account to access your support records.' : `Request failed (${data.error || 'service unavailable'}). No success is assumed. Retry a new ticket with the same request key if the result is uncertain.`);
  return data;
}
export default function CustomerSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]), [notifications, setNotifications] = useState<Notice[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null), [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [requestKey, setRequestKey] = useState('');
  const load = useCallback(async () => { const [a,b] = await Promise.all([api('tickets'),api('notifications')]); setTickets(a.tickets);setNotifications(b.notifications); }, []);
  useEffect(() => { void load().catch(e => setError(e.message)); setRequestKey(crypto.randomUUID()); }, [load]);
  async function run(action: () => Promise<void>) { setBusy(true);setError('');setNotice('');try { await action(); } catch(e) { setError(e instanceof Error ? e.message : 'Service unavailable.'); } finally { setBusy(false); } }
  async function open(id: string) { const data = await api(`tickets/detail?ticketId=${encodeURIComponent(id)}`);setTicket(data.ticket);setMessages(data.messages); }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();const form = event.currentTarget, fields = new FormData(form);
    void run(async () => { const result = await api('tickets', { category: fields.get('category'), subject: fields.get('subject'), description: fields.get('description'), requestKey }); await open(result.id); setNotice(`Ticket ${result.reference} saved. This is not an emergency-response guarantee.`);setRequestKey(crypto.randomUUID());form.reset();await load(); });
  }
  function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if (!ticket) return; const id = ticket.id, form = event.currentTarget, body = new FormData(form).get('body');
    void run(async () => { await api('tickets/reply', { ticketId: id, body });form.reset();await open(id);await load(); });
  }
  return <main className="sfw-shell"><nav className="sfw-nav" aria-label="Customer support navigation"><Link className="sfw-brand" href="/">SF <span>SHIELDCHAIN FINANCIAL</span></Link><div><Link href="/account/sessions">Account security</Link><Link href="/billing">Billing</Link><Link href="/sf-wallet">SF Wallet</Link></div></nav><header className="sfw-hero"><div><p className="sfw-eyebrow">ACCOUNT-ISOLATED CUSTOMER SUPPORT</p><h1>Your support.<span>A clear record.</span></h1><p>Submit and review persistent support records for your authenticated account. Database and sign-in setup must be available. No monitored response time is promised.</p></div></header>
    <p className="sfw-warning">Never include passwords, one-time codes, keys, recovery phrases, payment-card details or identity documents. This service is not an emergency contact or account-recovery credential submission channel.</p>{error && <p role="alert" className="sfw-error">{error}</p>}{notice && <p role="status" className="sfw-notice">{notice}</p>}
    <div className="sfw-grid"><section className="sfw-panel"><h2>New support ticket</h2><form onSubmit={create}><label>Topic<select name="category"><option value="ACCOUNT_ACCESS">Account access</option><option value="SECURITY">Security</option><option value="EXCHANGE">Exchange</option><option value="WALLET">Wallet</option><option value="CHALLENGE">Trading challenge</option><option value="PAYMENTS">Billing and payments</option><option value="FEEDBACK">Feedback</option><option value="OTHER">Other</option></select></label><label>Subject<input name="subject" required minLength={4} maxLength={120} /></label><label>Description<textarea name="description" required minLength={10} maxLength={5000} /></label><p>Submitting stores these details in your support record. Do not send secrets or unnecessary personal information.</p><button type="submit" disabled={busy || !requestKey}>Save ticket</button></form></section>
    <section className="sfw-panel"><h2>Your latest tickets</h2><button type="button" disabled={busy} onClick={() => void run(load)}>Refresh records</button>{tickets.map(t => <article key={t.id}><h3>{t.subject}</h3><p>{t.reference} · {t.status}</p><button disabled={busy} onClick={() => void run(() => open(t.id))}>Open conversation</button></article>)}<p>Shows up to 100 latest tickets. Missing records are not assumed deleted.</p></section></div>
    {ticket && <section className="sfw-panel"><h2>{ticket.subject}</h2><p>{ticket.reference} · {ticket.status}</p><ol>{messages.map(m => <li key={m.id}><strong>{m.authorType}</strong> · {new Date(m.createdAt).toLocaleString('en-AU')}<p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</p></li>)}</ol><p>Latest 100 public messages; internal staff notes are excluded.</p>{!['CLOSED','RESOLVED'].includes(ticket.status) && <form onSubmit={reply}><label>Reply<textarea name="body" required minLength={4} maxLength={5000} /></label><button disabled={busy}>Save reply</button><button type="button" disabled={busy} onClick={() => void run(async () => { await api('tickets/status',{ticketId:ticket.id,status:'CLOSED'});await open(ticket.id);await load(); })}>Close ticket</button></form>}</section>}
    <section className="sfw-panel"><h2>Account notifications</h2><p>In-app support updates only. No email or push notification is sent.</p>{notifications.map(n => <article key={n.id}><p>Support record updated · {new Date(n.createdAt).toLocaleString('en-AU')} · {n.readAt ? 'Read' : 'Unread'}</p><button disabled={busy} onClick={() => void run(() => open(n.resourceId))}>View ticket</button>{!n.readAt && <button disabled={busy} onClick={() => void run(async () => { await api('notifications/read',{notificationId:n.id});await load(); })}>Mark read</button>}</article>)}</section>
  </main>;
}
