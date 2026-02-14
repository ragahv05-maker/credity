import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Marquee from 'react-fast-marquee';
import Tilt from 'react-parallax-tilt';
import {
  ArrowUpRight,
  Blocks,
  BookKey,
  Building2,
  Check,
  CircleDashed,
  ExternalLink,
  FileCheck2,
  Globe,
  Lock,
  Mail,
  Radar,
  ShieldCheck,
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

const productCards = [
  {
    title: 'Issuer Studio',
    subtitle: 'Universities / Institutions',
    desc: 'Issue standards-aligned credentials, manage template governance, and control revocation lifecycle.',
    icon: Building2,
    href: URLS.issuer,
  },
  {
    title: 'BlockWallet Digi',
    subtitle: 'Credential Holders',
    desc: 'Claim and manage credentials with selective sharing and consent-aware user controls.',
    icon: Wallet,
    href: URLS.wallet,
  },
  {
    title: 'Recruiter Verify',
    subtitle: 'Hiring & Enterprise Teams',
    desc: 'Verify candidate claims instantly with cryptographic proof checks and anchor validation.',
    icon: FileCheck2,
    href: URLS.recruiter,
  },
] as const;

const featureTape = [
  'W3C DID + VC aligned',
  'On-chain anchoring + revocation',
  'DigiLocker compatibility path',
  'OID4VCI / OID4VP trajectory',
  'ZK-proof native architecture direction',
  'Enterprise verification workflows',
];

const digilockerPoints = [
  'Maps institution document semantics into verifiable credential contracts.',
  'Supports consent-aware verification exchanges for regulated deployments.',
  'Provides practical Web2 ↔ Web3 trust bridge for India-first integrations.',
  'Can layer with current records infra rather than forcing a hard replacement.',
];

function App() {
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });

  const mailHref = useMemo(() => {
    const subject = encodeURIComponent(`CredVerse Demo Request — ${form.org || 'New Organization'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nOrganization: ${form.org}\n\nUse case:\n${form.message}`,
    );
    return `mailto:${DEMO_EMAIL}?subject=${subject}&body=${body}`;
  }, [form]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.location.href = mailHref;
  };

  return (
    <div className="site">
      <header className="nav-shell">
        <a className="brand" href="#top">
          <img src="/credity-logo.jpg" alt="CredVerse" />
          <div>
            <strong>CredVerse</strong>
            <span>Credential Trust Infrastructure</span>
          </div>
        </a>

        <nav>
          <a href="#platform">Platform</a>
          <a href="#digilocker">DigiLocker</a>
          <a href="#evidence">Evidence</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="nav-cta" href="#contact">
          Book Pilot
        </a>
      </header>

      <main className="container" id="top">
        <section className="hero">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="hero-kicker">
              <Sparkles size={13} />
              Built for institutions that need trust, speed, and proof.
            </span>

            <h1>
              Credity,
              <br />
              rebuilt as a serious
              <br />
              trust product.
            </h1>

            <p>
              Issue credentials, empower holders, and verify claims instantly — with standards alignment,
              chain-backed evidence, and an architecture built for long-term interoperability.
            </p>

            <div className="hero-actions">
              <a className="btn btn-dark" href="#platform">
                Explore platform <ArrowUpRight size={15} />
              </a>
              <a className="btn btn-light" href={URLS.repo} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </motion.div>

          <motion.aside
            className="hero-board"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 0.08 }}
          >
            <div className="board-head">
              <span />
              <h3>Live Proof Board</h3>
            </div>

            <a href={URLS.contract} target="_blank" rel="noreferrer">
              Active registry contract
              <ExternalLink size={13} />
            </a>
            <a href={URLS.tx} target="_blank" rel="noreferrer">
              Latest e2e anchoring transaction
              <ExternalLink size={13} />
            </a>
            <a href={URLS.ci} target="_blank" rel="noreferrer">
              CI quality-gate history
              <ExternalLink size={13} />
            </a>

            <div className="board-foot">
              <ShieldCheck size={14} />
              Standards-first · Proof-backed · Integration-ready
            </div>
          </motion.aside>
        </section>

        <section className="tape">
          <Marquee gradient={false} speed={30} pauseOnHover>
            {featureTape.map((item) => (
              <div className="tape-item" key={item}>
                {item}
              </div>
            ))}
          </Marquee>
        </section>

        <section className="section" id="platform">
          <div className="section-head">
            <h2>Platform Modules</h2>
            <p>Three focused products, one coherent trust architecture.</p>
          </div>

          <div className="cards">
            {productCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Tilt key={card.title} tiltMaxAngleX={5} tiltMaxAngleY={5} glareEnable glareMaxOpacity={0.08}>
                  <motion.article
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                  >
                    <div className="card-title">
                      <div className="icon-box">
                        <Icon size={17} />
                      </div>
                      <div>
                        <h3>{card.title}</h3>
                        <small>{card.subtitle}</small>
                      </div>
                    </div>
                    <p>{card.desc}</p>
                    <a href={card.href} target="_blank" rel="noreferrer">
                      Open module <ArrowUpRight size={14} />
                    </a>
                  </motion.article>
                </Tilt>
              );
            })}
          </div>
        </section>

        <section className="section split" id="digilocker">
          <article className="panel">
            <div className="section-head compact">
              <h2>DigiLocker Compatibility</h2>
              <p>Not a buzzword section — this is the actual integration posture.</p>
            </div>

            <ul className="list">
              {digilockerPoints.map((point) => (
                <li key={point}>
                  <Check size={14} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel pathway">
            <h3>Compatibility Pathway</h3>
            <div className="path-grid">
              <div>
                <BookKey size={15} />
                <strong>Document Source</strong>
                <span>Institution records + official docs</span>
              </div>
              <div>
                <Blocks size={15} />
                <strong>VC Mapping Layer</strong>
                <span>Transforms into verifiable credential envelope</span>
              </div>
              <div>
                <ShieldCheck size={15} />
                <strong>Proof Layer</strong>
                <span>Signatures, anchors, revocation, verification</span>
              </div>
              <div>
                <Globe size={15} />
                <strong>Network Verification</strong>
                <span>Recruiters and partners verify quickly</span>
              </div>
            </div>
          </article>
        </section>

        <section className="section" id="evidence">
          <div className="section-head">
            <h2>Evidence Room</h2>
            <p>Hard proof links you can show in investor and enterprise calls.</p>
          </div>

          <div className="evidence">
            <article>
              <h3>
                <CircleDashed size={13} /> Contract Proof
              </h3>
              <p>Active Sepolia registry contract used by current test lanes.</p>
              <a href={URLS.contract} target="_blank" rel="noreferrer">
                Open on Etherscan <ExternalLink size={13} />
              </a>
            </article>

            <article>
              <h3>
                <CircleDashed size={13} /> Transaction Proof
              </h3>
              <p>Issue → claim → verify anchoring transaction evidence.</p>
              <a href={URLS.tx} target="_blank" rel="noreferrer">
                Open tx <ExternalLink size={13} />
              </a>
            </article>

            <article>
              <h3>
                <CircleDashed size={13} /> Build Reliability
              </h3>
              <p>Hosted quality gates and test workflows for release confidence.</p>
              <a href={URLS.ci} target="_blank" rel="noreferrer">
                Open CI board <ExternalLink size={13} />
              </a>
            </article>
          </div>
        </section>

        <section className="section split" id="contact">
          <article className="panel">
            <div className="section-head compact">
              <h2>Book a Pilot Demo</h2>
              <p>Share your use case and we’ll map the rollout architecture.</p>
            </div>

            <form className="form" onSubmit={onSubmit}>
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                required
                type="email"
                placeholder="Work Email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                required
                placeholder="Organization"
                value={form.org}
                onChange={(e) => setForm((prev) => ({ ...prev, org: e.target.value }))}
              />
              <textarea
                required
                rows={4}
                placeholder="Use case / expected scale"
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />
              <button type="submit">
                <Mail size={14} /> Send demo request
              </button>
            </form>
          </article>

          <article className="panel links">
            <h3>Quick Access</h3>
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
              GitHub Repository <ExternalLink size={13} />
            </a>

            <div className="small-note">
              <Lock size={13} />
              <span>
                Set <code>VITE_DEMO_EMAIL</code> in deploy env to route requests to your inbox.
              </span>
            </div>
          </article>
        </section>
      </main>

      <footer>
        <span>CredVerse · Trust rails for credentials</span>
        <a href={URLS.repo} target="_blank" rel="noreferrer">
          Source
        </a>
      </footer>
    </div>
  );
}

export default App;
