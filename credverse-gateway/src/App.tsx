import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import Marquee from 'react-fast-marquee';
import Tilt from 'react-parallax-tilt';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Blocks,
  BookCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  ExternalLink,
  Fingerprint,
  Globe,
  Link2,
  Lock,
  Mail,
  Radar,
  Sparkles,
  Wallet,
} from 'lucide-react';
import './App.css';

const URLS = {
  issuer: import.meta.env.VITE_ISSUER_URL || 'http://localhost:5001',
  wallet: import.meta.env.VITE_WALLET_URL || 'http://localhost:5002',
  recruiter: import.meta.env.VITE_RECRUITER_URL || 'http://localhost:5003',
  repo: 'https://github.com/ragahv05-maker/credity',
  contract: 'https://sepolia.etherscan.io/address/0x6060250FC92538571adde5c66803F8Cbe77145a1',
  tx: 'https://sepolia.etherscan.io/tx/0xe629bc09e2ab6891559b7205b6a66e9e63b31640824814366a0dfb0734972c46',
  ci: 'https://github.com/ragahv05-maker/credity/actions',
};

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'hello@credverse.app';

const portalCards: Array<{ title: string; subtitle: string; description: string; href: string; icon: LucideIcon }> = [
  {
    title: 'Issuer Studio',
    subtitle: 'For universities, institutions, certifying bodies',
    description: 'Issue W3C-aligned credentials, anchor proofs, and manage revocation lifecycle with confidence.',
    href: URLS.issuer,
    icon: Building2,
  },
  {
    title: 'BlockWallet Digi',
    subtitle: 'For holders and professionals',
    description: 'Claim, manage, and selectively share credentials with user-first controls and consent-aware UX.',
    href: URLS.wallet,
    icon: Wallet,
  },
  {
    title: 'Recruiter Verify',
    subtitle: 'For hiring teams and enterprises',
    description: 'Verify candidate claims instantly using cryptographic proof paths and tamper-evident records.',
    href: URLS.recruiter,
    icon: BriefcaseBusiness,
  },
];

const capabilityTags = [
  'W3C DID + VC aligned data model',
  'OID4VCI / OID4VP path readiness',
  'On-chain anchoring + revocation proofs',
  'DigiLocker compatibility bridge',
  'ZK-proof-native architecture direction',
  'Release gates + audit trails',
];

const lifecycle = [
  {
    title: 'Issue',
    text: 'Institution issues a standards-aligned credential from Issuer Studio.',
    icon: Building2,
  },
  {
    title: 'Claim',
    text: 'Holder claims and stores it in BlockWallet with consent-aware controls.',
    icon: Wallet,
  },
  {
    title: 'Share',
    text: 'Holder shares a proof package for recruiter or partner verification.',
    icon: Link2,
  },
  {
    title: 'Verify',
    text: 'Recruiter verifies cryptographic integrity + on-chain anchor in seconds.',
    icon: Radar,
  },
];

const digilockerPoints = [
  'Credential schema mapping can align government document semantics to VC format.',
  'Issuer and wallet flows support consent-aware exchange patterns for regulated environments.',
  'Architecture supports document-backed trust rails for India-first rollout strategies.',
  'CredVerse can function as practical Web2 ↔ Web3 verification bridge for institutions.',
];

const metricItems = [
  { end: 3, suffix: '', label: 'Core products in one platform' },
  { end: 100, suffix: '%', label: 'Verifiable credential-centric architecture' },
  { end: 1, suffix: ' chain', label: 'Active Sepolia anchor proof lane' },
  { end: 24, suffix: '/7', label: 'Automation-ready verification flow' },
];

const partnerTape = ['W3C VC', 'Ethereum Sepolia', 'DigiLocker Compatible Path', 'OID4VCI', 'OID4VP', 'ZK-Ready'];

function App() {
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent(`CredVerse Demo Request — ${form.org || 'New Organization'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nOrganization: ${form.org}\n\nUse case:\n${form.message}`,
    );
    return `mailto:${DEMO_EMAIL}?subject=${subject}&body=${body}`;
  }, [form]);

  const submitDemo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.location.href = mailtoHref;
  };

  return (
    <div className="page-shell" id="top">
      <div className="glow glow-1" />
      <div className="glow glow-2" />

      <header className="topbar">
        <a className="brand" href="#top">
          <img src="/credity-logo.jpg" alt="CredVerse logo" />
          <span>CredVerse</span>
        </a>

        <nav>
          <a href="#platform">Platform</a>
          <a href="#flow">Flow</a>
          <a href="#digilocker">DigiLocker</a>
          <a href="#evidence">Evidence</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="topbar-cta" href="#contact">
          Book Demo
        </a>
      </header>

      <main className="container">
        <section className="hero">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="pill">
              <Sparkles size={13} />
              Credential Infrastructure for Institutions & Enterprise Hiring
            </span>

            <h1>
              A serious trust layer
              <br />
              for digital credentials.
            </h1>

            <p>
              CredVerse helps institutions issue, holders manage, and recruiters verify credentials with
              standards alignment, chain evidence, and production-grade control surfaces.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#platform">
                Explore Platform <ArrowRight size={15} />
              </a>
              <a className="btn btn-ghost" href={URLS.repo} target="_blank" rel="noreferrer">
                View Repository
              </a>
            </div>
          </motion.div>

          <motion.div
            className="hero-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            <h3>Credential Assurance Stack</h3>
            <ul>
              <li>
                <CheckCircle2 size={14} /> W3C-aligned VC data contracts
              </li>
              <li>
                <CheckCircle2 size={14} /> Chain anchoring + revocation lifecycle
              </li>
              <li>
                <CheckCircle2 size={14} /> Recruiter-grade instant verification
              </li>
              <li>
                <CheckCircle2 size={14} /> DigiLocker compatibility narrative and bridge model
              </li>
            </ul>
            <div className="hero-proof-links">
              <a href={URLS.contract} target="_blank" rel="noreferrer">
                View Active Contract <ExternalLink size={13} />
              </a>
              <a href={URLS.tx} target="_blank" rel="noreferrer">
                View Latest Proof Tx <ExternalLink size={13} />
              </a>
            </div>
          </motion.div>
        </section>

        <section className="metrics">
          {metricItems.map((metric, idx) => (
            <motion.article
              key={metric.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
            >
              <strong>
                <CountUp end={metric.end} suffix={metric.suffix} duration={1.2} enableScrollSpy scrollSpyOnce />
              </strong>
              <span>{metric.label}</span>
            </motion.article>
          ))}
        </section>

        <section className="tape">
          <Marquee gradient={false} speed={34} pauseOnHover>
            {partnerTape.map((item) => (
              <div className="tape-item" key={item}>
                {item}
              </div>
            ))}
          </Marquee>
        </section>

        <section id="platform" className="section">
          <div className="section-head">
            <h2>Platform Modules</h2>
            <p>Clear product lanes, each mapped to a real actor in the credential lifecycle.</p>
          </div>

          <div className="cards">
            {portalCards.map((card) => {
              const Icon = card.icon;
              return (
                <Tilt key={card.title} tiltMaxAngleX={4} tiltMaxAngleY={4} glareEnable glareMaxOpacity={0.08}>
                  <article className="card">
                    <div className="card-head">
                      <div className="icon-wrap">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3>{card.title}</h3>
                        <small>{card.subtitle}</small>
                      </div>
                    </div>
                    <p>{card.description}</p>
                    <a href={card.href} target="_blank" rel="noreferrer">
                      Open module <ChevronRight size={14} />
                    </a>
                  </article>
                </Tilt>
              );
            })}
          </div>
        </section>

        <section id="flow" className="section">
          <div className="section-head">
            <h2>How the Trust Flow Works</h2>
            <p>One connected path from issuance to recruiter-grade verification.</p>
          </div>

          <div className="flow-grid">
            {lifecycle.map((node, idx) => {
              const Icon = node.icon;
              return (
                <article className="flow-node" key={node.title}>
                  <div className="flow-top">
                    <div className="icon-wrap">
                      <Icon size={16} />
                    </div>
                    <span>0{idx + 1}</span>
                  </div>
                  <h3>{node.title}</h3>
                  <p>{node.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="digilocker" className="section split">
          <article className="panel">
            <div className="section-head compact">
              <h2>DigiLocker Compatibility</h2>
              <p>Built so you can position CredVerse in India-facing institutional deployments.</p>
            </div>

            <ul className="check-list">
              {digilockerPoints.map((point) => (
                <li key={point}>
                  <BookCheck size={14} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel architecture">
            <h3>Compatibility Bridge Model</h3>
            <div className="architecture-grid">
              <div>
                <Database size={16} />
                <h4>Document Source</h4>
                <p>Institution-backed records and document rails.</p>
              </div>
              <div>
                <Blocks size={16} />
                <h4>VC Mapping Layer</h4>
                <p>Transforms records into verifiable credential structure.</p>
              </div>
              <div>
                <Fingerprint size={16} />
                <h4>Proof Layer</h4>
                <p>Anchoring, signatures, revocation, and verification checks.</p>
              </div>
              <div>
                <Globe size={16} />
                <h4>Verification Network</h4>
                <p>Recruiters and partners verify with cryptographic confidence.</p>
              </div>
            </div>
          </article>
        </section>

        <section id="evidence" className="section">
          <div className="section-head">
            <h2>Proof & Evidence</h2>
            <p>When you pitch, lead with evidence — not claims.</p>
          </div>

          <div className="evidence-grid">
            <article>
              <h3>
                <CircleDot size={14} /> Active Sepolia Contract
              </h3>
              <p>Current registry address used by the live test flow.</p>
              <a href={URLS.contract} target="_blank" rel="noreferrer">
                Open Etherscan <ExternalLink size={13} />
              </a>
            </article>

            <article>
              <h3>
                <CircleDot size={14} /> Issue → Claim → Verify tx proof
              </h3>
              <p>Recent chain evidence from end-to-end smoke verification.</p>
              <a href={URLS.tx} target="_blank" rel="noreferrer">
                Open transaction <ExternalLink size={13} />
              </a>
            </article>

            <article>
              <h3>
                <CircleDot size={14} /> CI Quality Gates
              </h3>
              <p>Hosted checks for test/lint/security gates across services.</p>
              <a href={URLS.ci} target="_blank" rel="noreferrer">
                Open workflow history <ExternalLink size={13} />
              </a>
            </article>
          </div>
        </section>

        <section id="contact" className="section split">
          <article className="panel">
            <div className="section-head compact">
              <h2>Book a Demo</h2>
              <p>Tell us your use case and we’ll tailor a walkthrough.</p>
            </div>

            <form className="demo-form" onSubmit={submitDemo}>
              <input
                placeholder="Name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                type="email"
                placeholder="Work Email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                placeholder="Organization"
                required
                value={form.org}
                onChange={(e) => setForm((prev) => ({ ...prev, org: e.target.value }))}
              />
              <textarea
                rows={4}
                placeholder="What problem are you solving?"
                required
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />
              <button type="submit">
                Send Demo Request <ArrowRight size={14} />
              </button>
            </form>
          </article>

          <article className="panel quick-links">
            <h3>Quick Launch Links</h3>
            <a href={URLS.issuer} target="_blank" rel="noreferrer">
              Issuer Studio <ExternalLink size={13} />
            </a>
            <a href={URLS.wallet} target="_blank" rel="noreferrer">
              BlockWallet Digi <ExternalLink size={13} />
            </a>
            <a href={URLS.recruiter} target="_blank" rel="noreferrer">
              Recruiter Verify <ExternalLink size={13} />
            </a>
            <a href={URLS.repo} target="_blank" rel="noreferrer">
              Repository <ExternalLink size={13} />
            </a>

            <div className="note">
              <Lock size={13} />
              Configure <code>VITE_DEMO_EMAIL</code> to route inbound demo requests.
            </div>
          </article>
        </section>
      </main>

      <footer className="footer">
        <span>CredVerse</span>
        <span>Built for verifiable trust rails in modern credential ecosystems.</span>
        <a href={URLS.repo} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}

export default App;
