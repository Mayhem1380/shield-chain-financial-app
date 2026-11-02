import Link from 'next/link';

const gates = [
  { id: '01', title: 'Reproducible dependencies', status: 'BLOCKED', detail: 'Create and review package-lock.json, install from the approved registry, and use npm ci in CI.' },
  { id: '02', title: 'Build and static quality', status: 'NOT VERIFIED', detail: 'Run TypeScript, lint and a production Next.js build against the locked dependency tree; resolve every failure.' },
  { id: '03', title: 'Identity and access', status: 'NOT CONNECTED', detail: 'Select an identity provider, implement server-side sessions and authorization, and test account recovery and abuse cases.' },
  { id: '04', title: 'Financial providers', status: 'NOT CONNECTED', detail: 'Complete legal/provider due diligence, contract review, sandbox integration, webhook verification and reconciliation.' },
  { id: '05', title: 'Security and recovery', status: 'NOT VERIFIED', detail: 'Complete independent testing, secrets management, monitoring, incident exercises, backup restoration and recovery objectives.' },
  { id: '06', title: 'Legal and customer readiness', status: 'NOT APPROVED', detail: 'Obtain jurisdiction-specific advice, approve disclosures and fees, define support escalation, complaints handling and operational ownership.' },
];

export default function LaunchReadinessPage() {
  return <main className="transparency-page">
    <header className="transparency-nav"><Link className="brand" href="/"><span className="brand-mark">S</span><span>SHIELDCHAIN <small>FINANCIAL</small></span></Link><nav><Link href="/dashboard">Demo workspace</Link><Link href="/transparency">Transparency centre</Link><Link href="/support">Help & feedback</Link></nav></header>
    <section className="transparency-hero"><div className="eyebrow"><span className="pulse"/> RELEASE CONTROL / INTERNAL ROADMAP</div><h1>Progress with proof.<br/><em>Launch with care.</em></h1><p>This readiness board separates completed scaffold checks from the evidence still required before a real service can launch. A checklist item is not approved merely because a page or policy document exists.</p><div className="transparency-status"><span className="status-dot"/> CURRENT STATE <strong>PRE-LAUNCH / NOT PRODUCTION READY</strong></div></section>
    <section className="transparency-grid">{gates.map((gate) => <article className="transparency-card" key={gate.id}><span>{gate.id} / {gate.status}</span><h2>{gate.title}</h2><p>{gate.detail}</p></article>)}</section>
    <section className="transparency-two-col"><article className="transparency-panel"><div className="eyebrow">VERIFIED IN THIS SCAFFOLD</div><h2>What current checks establish</h2><ul><li>Policy unit tests and static security checks can run without third-party app dependencies.</li><li>Database schema and required-file preflights check project structure.</li><li>Demo and health surfaces explicitly keep real financial capabilities disabled.</li></ul></article><article className="transparency-panel"><div className="eyebrow">HARD RELEASE RULE</div><h2>No evidence, no activation</h2><ul><li>No customer funds, real orders, custody, withdrawals, payments or payouts before required approvals.</li><li>No production release based only on passing static tests.</li><li>Each gate needs a named owner, evidence, review date and explicit approval recorded outside this demo page.</li></ul></article></section>
    <section className="transparency-disclaimer"><strong>Current blocker</strong><p>The dependency registry timed out during the previous install attempt. The project has no verified lockfile and the full framework build has not yet been run. This page is a roadmap, not a live deployment monitor or certification.</p><Link className="button button-primary" href="/beta">OPEN BETA READINESS PLAN <span>→</span></Link></section>
    <footer className="transparency-footer"><Link href="/">← Back to ShieldChain Financial</Link><span>© 2026 SF · Readiness roadmap, not certification</span></footer>
  </main>;
}
