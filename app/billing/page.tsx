'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Product = { code: string; title: string; amountMinor: number; currency: string };
type Payment = { id: string; productCode: string; amountMinor: number; currency: string; status: string; refundedMinor: number; riskHold: boolean; receiptUrl: string | null };
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100);

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/billing/${path}`, { ...init, credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) {
    const messages: Record<string, string> = {
      AUTHENTICATION_REQUIRED: 'Sign in to your verified customer account to view billing.',
      RECENT_MFA_REQUIRED: 'Complete a new multifactor authentication check before continuing.',
      PRODUCT_NOT_APPROVED: 'This service is not currently available for purchase.',
      PAYMENTS_NOT_CONFIGURED: 'Payments are not available yet.',
      PAYMENT_RATE_LIMITED: 'Please wait a minute before trying again.',
    };
    throw new Error(messages[data.error] || 'Billing is temporarily unavailable. No payment confirmation has been recorded here. Contact support if you were charged.');
  }
  return data;
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('');
  const keys = useRef<Record<string, string>>({});

  async function refresh() {
    setBusy(true); setError('');
    try {
      const orderId = new URLSearchParams(window.location.search).get('order');
      if (orderId) await api('reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
      const [orders, catalog] = await Promise.all([api('payments'), api('products')]);
      setPayments(orders.payments); setProducts(catalog.products); setMode(catalog.mode);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load billing.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function purchase(product: Product) {
    setBusy(true); setError('');
    try {
      keys.current[product.code] ||= crypto.randomUUID();
      const checkout = await api('checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': keys.current[product.code] }, body: JSON.stringify({ productCode: product.code }) });
      const url = new URL(checkout.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Unable to open the payment provider.');
      window.location.assign(url.href);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to open checkout.'); setBusy(false); }
  }

  return <main className="workspace-page">
    <header className="workspace-header"><div><h1>Payments and receipts</h1><p>Purchases and refunds linked to your customer account.</p></div><Link href="/account">Account</Link></header>
    <p>Your payment is confirmed only after the payment provider confirms it. Returning from checkout does not establish payment.</p>
    {mode === 'test' && <p role="status">Payment-provider test environment. Real customer funds cannot be processed in this environment.</p>}
    {error && <p role="alert">{error}</p>}
    <button className="button" type="button" disabled={busy} onClick={() => void refresh()}>{busy ? 'Checking billing…' : 'Refresh billing'}</button>
    <section aria-label="Available services" aria-busy={busy}><h2>Available services</h2>
      {!busy && !error && products.length === 0 && <p>No services are currently approved for checkout.</p>}
      {products.map(product => <article className="dash-panel" key={product.code}><h3>{product.title}</h3><p>{money(product.amountMinor, product.currency)}</p><button className="button" type="button" disabled={busy} onClick={() => void purchase(product)}>Continue to secure checkout</button></article>)}
    </section>
    <section aria-label="Your payments" aria-busy={busy}><h2>Your payments</h2>
      {!busy && !error && payments.length === 0 && <p>No payment records found for your account.</p>}
      {payments.map(payment => <article className="dash-panel" key={payment.id}><h3>{payment.productCode}</h3><p>Reference: {payment.id}</p><p>{money(payment.amountMinor, payment.currency)} · {payment.status.replaceAll('_', ' ').toLowerCase()}</p>{payment.refundedMinor > 0 && <p>Refunded: {money(payment.refundedMinor, payment.currency)}</p>}{payment.riskHold && <p>This payment requires review. Contact support with your reference.</p>}{payment.receiptUrl && <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">Payment-provider receipt</a>}</article>)}
    </section>
    <p>For refund requests, contact support with your payment reference. Never send card numbers or security codes.</p>
  </main>;
}
