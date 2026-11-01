import Link from 'next/link';

const principles = [
  { number: '01', title: 'Know what a price means', body: 'Prices shown in this project are illustrative examples, not live quotes. A real execution price can differ from a displayed price because of market movement, liquidity, spread and provider fees.' },
  { number: '02', title: 'See the full cost', body: 'A production transaction should disclose applicable trading fees, spreads, network charges, conversion rates and third-party costs before a customer confirms. No fee schedule is currently approved or connected.' },
  { number: '03', title: 'Understand the downside', body: 'Digital assets can be volatile and may lose some or all of their value. Transfers can be irreversible, services can be interrupted and tax obligations may apply. Only risk money you can afford to lose.' },
  { number: '04', title: 'Verify before acting', body: 'Check the recipient, network, asset and amount carefully. A polished interface is not proof that a wallet address, investment, provider or message is legitimate.' },
];

export default function TransparencyPage() {
  return <main className="transparency-page">
    <header className="transparency-nav">
      <Link className="brand" href="/"><span className="brand-mark">S</span><span>SHIELDCHAIN <small>FINANCIAL</small></span></Link>
      <nav><Link href="/dashboard">Demo workspace</Link><Link href="/status">Service status</Link><Link href="/handbook">Beginner’s Handbook</Link><Link href="/support">Help & feedback</Link></nav>
    </header>
    <section className="transparency-hero">
      <div className="eyebrow"><span className="pulse"/> CLARITY BEFORE COMMITMENT</div>
      <h1>Know the details.<br/><em>Keep control.</em></h1>
      <p>This transparency centre explains how to interpret the current SF concept, what is not yet connected, and what customers should understand before any real financial service is offered.</p>
      <div className="transparency-status"><span className="status-dot"/> CONCEPT / PRIVATE BETA PREPARATION <strong>NO LIVE FINANCIAL SERVICES</strong></div>
    </section>
    <section className="transparency-grid">
      {principles.map((item) => <article className="transparency-card" key={item.number}><span>{item.number}</span><h2>{item.title}</h2><p>{item.body}</p></article>)}
    </section>
    <section className="transparency-two-col">
      <article className="transparency-panel">
        <div className="eyebrow">CURRENT PROJECT STATUS</div><h2>What is—and isn’t—available</h2>
        <ul><li><strong>Available:</strong> navigable interface previews, sample data, educational content and policy foundations.</li><li><strong>Not connected:</strong> real market feeds, customer authentication, identity verification, payment rails, custody, live orders, deposits, withdrawals or challenge payouts.</li><li><strong>Not yet established:</strong> approved fee schedule, provider agreements, production security assessment, licences or authorisations, and launch approval.</li></ul>
      </article>
      <article className="transparency-panel">
        <div className="eyebrow">BEFORE A FUTURE LAUNCH</div><h2>Our release principles</h2>
        <ul><li>Show material fees, limits, eligibility and risks before confirmation.</li><li>Use independent legal and compliance advice for the actual services and markets.</li><li>Test security, identity controls, support escalation, incident response and recovery.</li><li>Keep customer funds and financial operations disabled until the required controls and approvals are verified.</li></ul>
      </article>
    </section>
    <section className="transparency-disclaimer"><strong>Important</strong><p>ShieldChain Financial is a concept platform in development. This page is general information, not financial, investment, tax or legal advice, and not an offer to buy or sell a financial product. Digital-asset services can involve substantial risk. Product availability, fees, regulatory status and protections must be verified for the relevant service and jurisdiction before launch.</p><Link className="button button-primary" href="/handbook">READ THE BEGINNER’S HANDBOOK <span>→</span></Link></section>
    <footer className="transparency-footer"><Link href="/">← Back to ShieldChain Financial</Link><span>© 2026 SF · Concept in development</span></footer>
  </main>;
}
