'use client';
import Link from 'next/link';
import { useState } from 'react';
const gates = [
  { title: 'Company and product scope confirmed', detail: 'Confirm the legal entity, services and operating jurisdictions with qualified counsel.' },
  { title: 'Regulatory and compliance review completed', detail: 'Document required licensing, financial services, AML/CTF, sanctions, privacy and consumer obligations.' },
  { title: 'Authentication and account recovery tested', detail: 'Use an established identity provider, MFA/passkeys, secure recovery and session revocation.' },
  { title: 'Privacy notice and customer terms approved', detail: 'Publish reviewed disclosures, fees, risk warnings, complaints process and data-retention rules.' },
  { title: 'Provider contracts and permitted-use confirmed', detail: 'Get written confirmation for trading, payments, custody and any supported asset networks.' },
  { title: 'Security review and incident rehearsal passed', detail: 'Complete threat modelling, independent testing, backups, monitoring and response drills.' },
  { title: 'Financial controls and reconciliation tested', detail: 'Test immutable ledger design, webhook signatures, idempotency, reconciliation and dual approval.' },
  { title: 'Support, monitoring and rollback ready', detail: 'Assign human escalation owners, support coverage, service monitoring and a tested rollback plan.' },
];
export default function BetaPage() {
  const [checked, setChecked] = useState<string[]>([]);
  const count = checked.length;
  return <main className="workspace-page"><header className="workspace-header"><div><div className="eyebrow">SHIELDCHAIN FINANCIAL / RELEASE GATES</div><h1>Private beta readiness</h1><p>A practical checklist for deciding whether a limited release is ready for review.</p></div><Link className="button button-quiet" href="/">← Public concept</Link></header>
    <div className="admin-warning"><strong>Checklist only—not certification or legal approval.</strong> Checking items here is not proof that they are complete. Selections stay in this page session and are not saved or submitted.</div>
    <section className="readiness-card"><div className="readiness-top"><div><span className="eyebrow">READINESS TRACKER</span><h2>{count} of {gates.length} gates marked</h2></div><strong>{Math.round((count / gates.length) * 100)}%</strong></div><div className="progress large-progress"><i style={{ width: `${(count / gates.length) * 100}%` }} /></div><p>Do not accept real customer funds or enable live trading, custody or payouts until all relevant gates are evidenced, independently reviewed where appropriate and formally approved.</p><button className="button button-quiet" onClick={() => setChecked([])}>Reset checklist</button></section>
    <div className="gate-list">{gates.map((gate, index) => <label className={`gate-item ${checked.includes(gate.title) ? 'gate-checked' : ''}`} key={gate.title}><input type="checkbox" checked={checked.includes(gate.title)} onChange={(e) => setChecked((current) => e.target.checked ? [...current, gate.title] : current.filter((item) => item !== gate.title))} /><span className="gate-number">{String(index + 1).padStart(2, '0')}</span><span className="gate-copy"><strong>{gate.title}</strong><small>{gate.detail}</small></span></label>)}</div>
    <section className="beta-next"><h2>Suggested build order</h2><ol><li>Identity, roles, consent and secure sessions.</li><li>Persisted customer support and beta feedback with privacy controls.</li><li>Deterministic simulated trading engine with versioned rules and tests.</li><li>Admin access controls and append-only audit trail.</li><li>Provider integrations only after written approval and test-environment validation.</li></ol><p className="fine-print">The current codebase is still a starter scaffold. This page does not create accounts, submit beta applications, or connect any external service.</p></section>
    <footer className="dash-footer">ShieldChain Financial · Internal planning tool · Not a launch approval</footer></main>;
}
