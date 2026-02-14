import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Blocks,
  Building2,
  CalendarRange,
  CheckCircle2,
  FileBadge2,
  Globe2,
  Landmark,
  Link2,
  Lock,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
  Zap,
} from 'lucide-react';
import './App.css';

const PORTAL_URLS = {
  issuer: import.meta.env.VITE_ISSUER_URL || 'http://localhost:5001',
  wallet: import.meta.env.VITE_WALLET_URL || 'http://localhost:5002',
  recruiter: import.meta.env.VITE_RECRUITER_URL || 'http://localhost:5003',
};

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'hello@credverse.app';

const metrics = [
  { value: '4', label: 'Integrated Products' },
  { value: 'W3C', label: 'DID/VC-Aligned Stack' },
  { value: 'Sepolia', label: 'Active On-chain Registry' },
  { value: 'E2E', label: 'Issue → Claim → Verify Flow' },
];

const ecosystemCards: Array<{
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  href: string;
}> = [
  {
    title: 'CredVerse Issuer',
    subtitle: 'Institution Command Center',
    description:
      'Issue standards-compliant Verifiable Credentials, manage templates, and anchor proofs on-chain.',
    icon: Building2,
    href: PORTAL_URLS.issuer,
  },
  {
    title: 'BlockWallet Digi',
    subtitle: 'User Sovereignty Engine',
    description:
      'Holders claim, store, and share credentials while preserving user-controlled consent and portability.',
    icon: Wallet,
    href: PORTAL_URLS.wallet,
  },
  {
    title: 'CredVerse Recruiter',
    subtitle: 'Verification Intelligence Hub',
    description:
      'Recruiters verify claims with cryptographic proof paths and fraud-resistant verification workflows.',
    icon: FileBadge2,
    href: PORTAL_URLS.recruiter,
  },
  {
    title: 'CredVerse Gateway',
    subtitle: 'Unified Access Layer',
    description:
      'Single ecosystem entrypoint for demos, public navigation, and service-level handoff.',
    icon: Globe2,
    href: '#top',
  },
];

const capabilities = [
  'W3C DID + Verifiable Credentials support',
  'OID4VCI / OID4VP aligned interaction patterns',
  'Blockchain anchoring + revocation lifecycle',
  'ZK-proof-native architecture trajectory',
  'Role-based auth + API key security layers',
  'Cross-service auditability and release gates',
];

const digilockerCompatibility = [
  'Credential data structures designed for document-backed issuance workflows.',
  'Server integration hooks already present for DigiLocker credential ingestion.',
  'Consent-aware claim and verification pipelines fit India-first compliance contexts.',
  'Can be deployed as DigiLocker-compatible issuance + verification rails for institutions.',
];

const roadmap = [
  {
    phase: 'Phase 1 (Now)',
    title: 'Credibility Layer + Core Products',
    details:
      'Issuer, Wallet, Recruiter, and Gateway are operational with hardened backend gates and Sepolia anchoring.',
    status: 'Live',
  },
  {
    phase: 'Phase 2',
    title: 'Institutional Rollout + DigiLocker Integrations',
    details:
      'Production deployment for universities and partner ecosystems with enterprise integrations.',
    status: 'In Progress',
  },
  {
    phase: 'Phase 3',
    title: 'Advanced ZK Verification Network',
    details:
      'Move from deterministic proof adapters to deeper production-grade ZK backends and federation patterns.',
    status: 'Next',
  },
];

const teamCards = [
  {
    title: 'Founder & Product Vision',
    description: 'Strategy, ecosystem partnerships, and market positioning for Web3 credential adoption.',
    icon: Rocket,
  },
  {
    title: 'Protocol & Backend Engineering',
    description: 'DID/VC flows, anchoring logic, verification services, and security hardening.',
    icon: Blocks,
  },
  {
    title: 'Institution & Ecosystem Partnerships',
    description: 'University onboarding, recruiter collaborations, and compliance-aligned rollout.',
    icon: Landmark,
  },
];

const partnerStrip = ['W3C VC', 'Ethereum Sepolia', 'DigiLocker Compatible', 'OID4VCI/OID4VP', 'ZK-Ready'];

function App() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });

  const submitDemoRequest = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const subject = encodeURIComponent(`CredVerse Demo Request — ${form.organization || 'New Organization'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nOrganization: ${form.organization}\n\nUse case:\n${form.message}`,
    );

    window.location.href = `mailto:${DEMO_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="site-shell" id="top">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="top-nav">
        <div className="brand">
          <div className="brand-icon-wrap">
            <img src="/credity-logo.jpg" alt="CredVerse" className="brand-logo" />
          </div>
          <span>CredVerse</span>
        </div>
        <div className="nav-links">
          <a href="#ecosystem">Ecosystem</a>
          <a href="#digilocker">DigiLocker</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#contact">Contact</a>
        </div>
        <a className="nav-cta" href={PORTAL_URLS.issuer} target="_blank" rel="noreferrer">
          Open Platform
        </a>
      </header>

      <main className="content-wrap">
        <motion.section
          className="hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Web3 Credential Infrastructure</span>
          </div>

          <h1>
            The trust layer for digital credentials.
            <br />
            <span>Issue. Hold. Verify. Scale.</span>
          </h1>

          <p>
            CredVerse is an end-to-end ecosystem for institutions, users, and recruiters — built on
            W3C DID/VC standards, blockchain proof anchoring, and a DigiLocker-compatible rollout path.
          </p>

          <div className="hero-actions">
            <a className="btn-primary" href="#ecosystem">
              Explore Ecosystem <ArrowRight size={16} />
            </a>
            <a
              className="btn-ghost"
              href="https://github.com/ragahv05-maker/credity"
              target="_blank"
              rel="noreferrer"
            >
              View GitHub
            </a>
          </div>

          <div className="stat-grid">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <section className="partner-strip" aria-label="compatibility">
          {partnerStrip.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </section>

        <section className="section" id="ecosystem">
          <div className="section-head">
            <h2>Full Ecosystem</h2>
            <p>Showcase-ready product suite for institutions and Web3 communities.</p>
          </div>

          <div className="card-grid">
            {ecosystemCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.article
                  key={card.title}
                  className="product-card"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: index * 0.05, duration: 0.28 }}
                >
                  <div className="card-head">
                    <div className="card-icon">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3>{card.title}</h3>
                      <small>{card.subtitle}</small>
                    </div>
                  </div>
                  <p>{card.description}</p>
                  <a href={card.href} target="_blank" rel="noreferrer">
                    Visit <ArrowRight size={14} />
                  </a>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="section" id="capabilities">
          <div className="section-head">
            <h2>Core Capabilities</h2>
            <p>Production-grade backend capabilities presented in a clean public narrative.</p>
          </div>
          <div className="pill-wrap">
            {capabilities.map((item) => (
              <div className="cap-pill" key={item}>
                <CheckCircle2 size={14} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="digilocker">
          <div className="section-head">
            <h2>DigiLocker Compatibility</h2>
            <p>India-first interoperability story ready for institutional conversations.</p>
          </div>

          <article className="focus-card">
            <div className="focus-head">
              <div className="focus-icon">
                <Link2 size={18} />
              </div>
              <div>
                <h3>DigiLocker-ready integration path</h3>
                <small>Position CredVerse as Web2 ↔ Web3 trust bridge</small>
              </div>
            </div>
            <ul>
              {digilockerCompatibility.map((point) => (
                <li key={point}>
                  <ShieldCheck size={14} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="section" id="roadmap">
          <div className="section-head">
            <h2>Roadmap</h2>
            <p>Clear execution narrative for demos, investor calls, and partner discussions.</p>
          </div>

          <div className="timeline">
            {roadmap.map((item) => (
              <article className="timeline-item" key={item.phase}>
                <div className="timeline-icon">
                  <CalendarRange size={16} />
                </div>
                <div>
                  <span className="timeline-phase">{item.phase}</span>
                  <h3>{item.title}</h3>
                  <p>{item.details}</p>
                </div>
                <span className="timeline-status">{item.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="team">
          <div className="section-head">
            <h2>Team & Advisors</h2>
            <p>Foundational blocks you can present now, expandable with real advisor profiles.</p>
          </div>

          <div className="highlight-grid">
            {teamCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="highlight-card">
                  <div className="highlight-icon">
                    <Icon size={18} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section" id="contact">
          <div className="section-head">
            <h2>Request Demo / Partnership Call</h2>
            <p>Use this section directly when sharing with institutions or ecosystem partners.</p>
          </div>

          <div className="contact-grid">
            <article className="focus-card">
              <div className="focus-head">
                <div className="focus-icon">
                  <Mail size={18} />
                </div>
                <div>
                  <h3>Demo Request Form</h3>
                  <small>Submits through your configured email route</small>
                </div>
              </div>

              <form className="demo-form" onSubmit={submitDemoRequest}>
                <input
                  placeholder="Your name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Work email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
                <input
                  placeholder="Organization"
                  required
                  value={form.organization}
                  onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                />
                <textarea
                  placeholder="Use case / what you want to verify"
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
                <button type="submit">
                  Send Demo Request <ArrowRight size={14} />
                </button>
              </form>
            </article>

            <article className="focus-card side-cta">
              <div className="focus-head">
                <div className="focus-icon">
                  <Workflow size={18} />
                </div>
                <div>
                  <h3>Deploy & Demo Links</h3>
                  <small>Everything needed to present quickly</small>
                </div>
              </div>

              <a href={PORTAL_URLS.issuer} target="_blank" rel="noreferrer">
                Issuer Portal <ArrowRight size={14} />
              </a>
              <a href={PORTAL_URLS.wallet} target="_blank" rel="noreferrer">
                Wallet Portal <ArrowRight size={14} />
              </a>
              <a href={PORTAL_URLS.recruiter} target="_blank" rel="noreferrer">
                Recruiter Portal <ArrowRight size={14} />
              </a>
              <a href="https://github.com/ragahv05-maker/credity" target="_blank" rel="noreferrer">
                Codebase / Build Proof <ArrowRight size={14} />
              </a>

              <div className="note">
                <Lock size={14} />
                <span>
                  Set <code>VITE_DEMO_EMAIL</code> in deployment env to route demo requests to your active inbox.
                </span>
              </div>
            </article>
          </div>
        </section>

        <section className="section final-cta">
          <h2>CredVerse is now presentation-ready.</h2>
          <p>
            Share this website as your official Web3 credential project surface while backend hardening and
            enterprise integrations continue in parallel.
          </p>
          <div className="hero-actions">
            <a className="btn-primary" href={PORTAL_URLS.recruiter} target="_blank" rel="noreferrer">
              Open Live Demo <Zap size={15} />
            </a>
            <a className="btn-ghost" href="#contact">
              Book a Demo Call
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
