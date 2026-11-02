import Link from 'next/link';

const services = [
  { name: 'Public website & demo workspace', state: 'Preview available', detail: 'Interface and sample content only; availability is not monitored in real time.', tone: 'preview' },
  { name: 'Account sign-in & identity checks', state: 'Not connected', detail: 'No production authentication or identity provider is configured.', tone: 'blocked' },
  { name: 'Market prices & exchange quotes', state: 'Not connected', detail: 'No live market data, routing, exchange orders or quote execution.', tone: 'blocked' },
  { name: 'Deposits, custody & withdrawals', state: 'Disabled', detail: 'No customer funds or wallet movements can be processed by this project.', tone: 'blocked' },
  { name: 'Payments, rewards & challenge payouts', state: 'Disabled', detail: 'No payment rail or payout provider is connected.', tone: 'blocked' },
];

const responseSteps = [
  { number: '01', title: 'Detect and verify', body: 'A future operations team confirms the scope and impact using monitored systems—not customer rumours alone.' },
  { number: '02', title: 'Protect customers', body: 'Contain affected functionality, preserve evidence and keep risky financial actions disabled while the incident is assessed.' },
  { number: '03', title: 'Communicate clearly', body: 'Publish a timestamped update describing known impact, safe customer actions and the next update time when it can be responsibly stated.' },
  { number: '04', title: 'Resolve and review', body: 'Restore service only after checks pass, then document the cause, remediation and follow-up actions.' },
];

export default function StatusPage() {
  return <main className="status-page">
    <header className="transparency-nav"><Link className="brand" href="/"><span className="brand-mark">S</span><span>SHIELDCHAIN <small>FINANCIAL</small></span></Link><nav><Link href="/transparency">Transparency</Link><Link href="/support">Help & feedback</Link><Link href="/launch-readiness">Launch readiness</Link></nav></header>
    <section className="status-hero"><div className="eyebrow"><span className="pulse"/> SERVICE STATUS / CONCEPT</div><h1>Clear updates.<br/><em>No guesswork.</em></h1><p>This page defines how ShieldChain Financial intends to communicate service availability and incidents. It is a static project preview—not a live uptime monitor, incident feed or guarantee of availability.</p><div className="status-banner"><span className="status-dot"/><div><strong>PRE-LAUNCH PREVIEW</strong><small>Live monitoring and alert integrations are not configured.</small></div><span className="status-label">NOT LIVE</span></div></section>
    <section className="status-section"><div className="status-section-heading"><div><div className="eyebrow">SERVICE CATALOGUE</div><h2>What is currently connected?</h2></div><p>Statuses below describe this project’s implementation scope, not current production uptime.</p></div><div className="status-service-list">{services.map(service => <article className="status-service" key={service.name}><div className="status-service-copy"><h3>{service.name}</h3><p>{service.detail}</p></div><span className={`status-pill status-${service.tone}`}>{service.state}</span></article>)}</div></section>
    <section className="status-section status-response-section"><div className="eyebrow">INCIDENT COMMUNICATION STANDARD</div><h2>If something goes wrong, customers deserve facts.</h2><div className="status-response-grid">{responseSteps.map(step => <article className="status-response-card" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>
    <section className="status-template"><div className="eyebrow">FUTURE STATUS UPDATE FORMAT</div><h2>What a useful update should contain</h2><ul><li><strong>Last updated:</strong> exact date, time and timezone.</li><li><strong>Impact:</strong> which service and customer actions are affected.</li><li><strong>Known facts:</strong> confirmed details separated from investigation.</li><li><strong>Customer guidance:</strong> safe actions and actions to avoid.</li><li><strong>Next update:</strong> a realistic time for another update, even if the issue is not resolved.</li></ul><p>Do not publish speculative causes, personal data, security-sensitive details or unsupported recovery estimates. Never describe a service as operational unless monitoring evidence supports that statement.</p><Link className="button button-primary" href="/support">HELP & SAFETY GUIDANCE <span>→</span></Link></section>
    <footer className="transparency-footer"><Link href="/">← Back to ShieldChain Financial</Link><span>© 2026 SF · Concept in development · No live status feed</span></footer>
  </main>;
}
