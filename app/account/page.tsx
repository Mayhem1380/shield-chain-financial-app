'use client';

import Link from 'next/link';
import { useState } from 'react';

type Mode = 'signin' | 'create';

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>('create');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function previewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('Preview only: no account was created and no sign-in request was sent. Identity-provider integration and security review are required before this can be enabled.');
  }

  return (
    <main className="workspace-page account-page">
      <header className="workspace-header">
        <div>
          <Link className="account-back" href="/">← ShieldChain Financial</Link>
          <div className="eyebrow">ACCOUNT SECURITY / PREVIEW</div>
          <h1>{mode === 'create' ? 'Your next chapter starts here.' : 'Welcome back.'}</h1>
          <p>{mode === 'create' ? 'A clear, considered account experience—built around privacy and responsible access.' : 'Sign-in screens are being prepared for a reviewed identity provider.'}</p>
        </div>
        <span className="account-status">DEMO · NOT CONNECTED</span>
      </header>

      <div className="account-layout">
        <section className="account-story">
          <div className="account-emblem"><span>SF</span></div>
          <span className="eyebrow">TRADE · INVEST · GROW</span>
          <h2>More than just a platform.</h2>
          <p>Our goal is to make complex financial tools easier to understand, with transparent information and security built into the experience.</p>
          <ul>
            <li><span>01</span><div><strong>Clarity first</strong><small>Understand what a feature does before you use it.</small></div></li>
            <li><span>02</span><div><strong>Privacy matters</strong><small>Account data should be handled with care and purpose.</small></div></li>
            <li><span>03</span><div><strong>Human support</strong><small>Important account issues need a clear escalation path.</small></div></li>
          </ul>
        </section>

        <section className="account-card">
          <div className="account-tabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); setMessage(''); }}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setMessage(''); }}>Sign in</button>
          </div>
          <span className="eyebrow">{mode === 'create' ? 'GET STARTED' : 'ACCOUNT ACCESS'}</span>
          <h2>{mode === 'create' ? 'Preview account registration' : 'Preview ShieldChain sign-in'}</h2>
          <p className="account-muted">{mode === 'create' ? 'This is a simulated registration screen. No account is created or email sent.' : 'Secure sign-in will be available after identity integration is configured.'}</p>
          <form onSubmit={previewSubmit}>
            <label className="field-label" htmlFor="account-email">EMAIL ADDRESS</label>
            <input className="field-control" id="account-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(''); }} required />
            <button className="button button-primary account-submit" type="submit">{mode === 'create' ? 'Continue' : 'Continue to sign in'} <span>↗</span></button>
          </form>
          {message && <p className="account-message" role="status">{message}</p>}
          <p className="account-terms">No password or financial details are requested in this preview. Submitting this form does not create an account, send email, or store the address.</p>
          <div className="account-security"><span>◇</span><p><strong>Security before activation</strong><small>Identity verification, secure sessions, recovery controls and access monitoring must be integrated and tested before real accounts are enabled.</small></p></div><div className="account-security"><span>✓</span><p><strong>Email and withdrawal verification</strong><small>Before live withdrawals are enabled, customers must verify their email and complete required identity checks. Account identity and beneficiary details must match where required; mismatches go to review.</small></p></div>
          <div className="account-journey" aria-label="Planned account verification steps">
            <div className="account-journey-heading"><span className="eyebrow">PLANNED ONBOARDING</span><span className="account-journey-badge">NOT ACTIVE</span></div>
            <ol>
              <li><span>01</span><div><strong>Verify your email</strong><small>Confirm control of the address before account activation.</small></div><em>Planned</em></li>
              <li><span>02</span><div><strong>Confirm your identity</strong><small>Complete required checks through an approved verification provider.</small></div><em>Planned</em></li>
              <li><span>03</span><div><strong>Resolve any mismatch</strong><small>Incomplete or inconsistent details are held for review—not silently approved.</small></div><em>Planned</em></li>
              <li><span>04</span><div><strong>Review withdrawal eligibility</strong><small>Future withdrawals require server-side checks and controlled approval.</small></div><em>Planned</em></li>
            </ol>
            <p>These are intended controls, not available services. No identity documents or financial transactions are processed here.</p>
          </div>
          <p className="account-terms">Learn how the planned services work in the <Link href="/handbook">Beginner’s Handbook</Link>. For the engineering requirements behind this flow, see the project’s Identity and Withdrawal Control Plan.</p>
        </section>
      </div>
      <footer className="dash-footer">ShieldChain Financial · Account experience preview · No live authentication</footer>
    </main>
  );
}
