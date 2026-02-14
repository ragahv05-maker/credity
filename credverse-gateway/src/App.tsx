import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  ArrowUpRight,
  Blocks,
  BookCheck,
  Building2,
  Check,
  ExternalLink,
  FileCheck2,
  Globe2,
  Lock,
  Mail,
  Radar,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import './App.css';

const URLS = {
  issuer: import.meta.env.VITE_ISSUER_URL || 'http://localhost:5001',
  wallet: import.meta.env.VITE_WALLET_URL || 'http://localhost:5002',
  recruiter: import.meta.env.VITE_RECRUITER_URL || 'http://localhost:5003',
  repo: 'https://github.com/raghav05-maker/credity',
  ci: 'https://github.com/ragahv05-maker/credity/actions',
  releaseBoard:
    'https://github.com/ragahv05-maker/credity/blob/main/swarm/reports/credity-s28-release-board.md',
  contract: 'https://sepolia.etherscan.io/address/0x6060250FC92538571adde5c66803F8Cbe77145a1',
  tx: 'https://sepolia.etherscan.io/tx/0xe629bc09e2ab6891559b7205b6a66e9e63b31640824814366a0dfb0734972c46',
};

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'hello@credverse.app';

const moduleCards = [
  {
    title: 'Issuer Studio',
    subtitle: 'Universities / Institutions',
    description:
      'Issue standards-aligned credentials, manage schema governance, and control revocation with operational clarity.',
    href: URLS.issuer,
    icon: Building2,
  },
  {
    title: 'BlockWallet Digi',
    subtitle: 'Credential Holders',
    description:
      'Claim and manage credentials with selective sharing and consent-aware controls designed for real candidate workflows.',
    href: URLS.wallet,
    icon: Wallet,
  },
  {
    title: 'Recruiter Verify',
    subtitle: 'Hiring & Enterprise Teams',
    description:
      'Validate candidate claims in seconds with cryptographic checks, revocation awareness, and anchor verification.',
    href: URLS.recruiter,
    icon: FileCheck2,
  },
] as const;

const metrics = [
  {
    label: 'Contract Anchors Active',
    value: 1,
    suffix: '',
    note: 'Sepolia registry currently live and referenced by the gateway.',
  },
  {
    label: 'Critical Runtime Vulnerabilities',
    value: 0,
    suffix: '',
    note: 'Security audit gate returned zero high vulnerabilities.',
  },
  {
    label: 'Hosted CI Gate Runs (post-fix)',
    value: 2,
    suffix: '/2',
    note: 'Push + workflow dispatch runs completed successfully.',
  },
  {
    label: 'Proof Flow Validation',
    value: 100,
    suffix: '%',
    note: 'Issue → claim → verify smoke path has on-chain evidence.',
  },
] as const;

const architecture = [
  {
    title: 'Standards Core',
    icon: BookCheck,
    description: 'W3C DID/VC-compatible envelope for long-horizon interoperability and migration safety.',
  },
  {
    title: 'Proof + Policy Layer',
    icon: ShieldCheck,
    description: 'Signatures, revocation, and policy checks for institution and recruiter-grade confidence.',
  },
  {
    title: 'Network Verification Rail',
    icon: Globe2,
    description: 'Fast verification pathways for enterprise hiring, compliance checks, and cross-org trust.',
  },
] as const;

const audienceTracks = [
  {
    title: 'Institution Track',
    subtitle: 'credibility-first sequencing',
    points: [
      'Outcome-led hero + trust strip for fast governance confidence.',
      'Research/project evidence before narrative claims.',
      'Security/compliance posture clearly surfaced before rollout CTA.',
    ],
    cta: 'Request institution pilot architecture',
  },
  {
    title: 'Recruiter Track',
    subtitle: 'speed-to-signal sequencing',
    points: [
      'Role-fit headline with measurable impact metrics above the fold.',
      'Case-study evidence with proof links instead of generic claims.',
      'Low-friction CTA for hiring teams to verify candidate trust quickly.',
    ],
    cta: 'Book recruiter verification demo',
  },
] as const;

const digilockerBullets = [
  'Maps official institution record semantics into VC-ready payload contracts.',
  'Supports consent-aware verification exchanges required in regulated deployments.',
  'Acts as a practical Web2 ↔ Web3 bridge instead of forcing destructive replacement.',
  'Keeps room for OID4VCI / OID4VP rollout without redesigning the product spine.',
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] },
  },
};

function App() {
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });

  const mailHref = useMemo(() => {
    const subject = encodeURIComponent(`CredVerse Demo Request — ${form.org || 'New Organization'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nOrganization: ${form.org}\n\nUse case:\n${form.message}`,
    );
    return `mailto:${DEMO_EMAIL}?subject=${subject}&body=${body}`;
  }, [form]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.href = mailHref;
  };

  return (
    <div className="site">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

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
          <a href="#architecture">Architecture</a>
          <a href="#audience">Audience</a>
          <a href="#evidence">Evidence</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="nav-cta" href="#contact">
          Book Pilot
        </a>
      </header>

      <main className="container" id="top">
        <section className="hero">
          <motion.div className="hero-copy" variants={fadeUp} initial="hidden" animate="show">
            <span className="hero-kicker">
              <ShieldCheck size={13} /> Standards first · Proof backed · Enterprise ready
            </span>

            <h1>
              Trust rails for
              <br />
              verifiable credentials,
              <br />
              built for hiring.
            </h1>

            <p>
              Credity gives institutions, candidates, and recruiters one coherent system for issuing, sharing,
              and verifying credentials with cryptographic assurance and operational clarity.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#platform">
                Explore Platform <ArrowUpRight size={15} />
              </a>
              <a className="btn btn-ghost" href={URLS.repo} target="_blank" rel="noreferrer">
                View Source
              </a>
            </div>
          </motion.div>

          <motion.aside
            className="hero-panel"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.08 }}
          >
            <div className="panel-logo-wrap">
              <img src="/credity-logo.jpg" alt="CredVerse logo" />
              <div>
                <span>Live Proof Board</span>
                <strong>Launch-grade evidence links</strong>
              </div>
            </div>

            <a href={URLS.contract} target="_blank" rel="noreferrer">
              Active registry contract <ExternalLink size={13} />
            </a>
            <a href={URLS.tx} target="_blank" rel="noreferrer">
              Latest anchoring transaction <ExternalLink size={13} />
            </a>
            <a href={URLS.ci} target="_blank" rel="noreferrer">
              Hosted quality gates <ExternalLink size={13} />
            </a>
            <a href={URLS.releaseBoard} target="_blank" rel="noreferrer">
              Release board (GO evidence) <ExternalLink size={13} />
            </a>

            <div className="panel-note">
              <Lock size={13} /> Evidence-first posture for investor and enterprise diligence calls.
            </div>
          </motion.aside>
        </section>

        <motion.section
          className="metrics"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
          }}
        >
          {metrics.map((item) => (
            <motion.article key={item.label} className="metric" variants={fadeUp}>
              <span className="metric-value">
                <CountUp end={item.value} duration={1.6} suffix={item.suffix} />
              </span>
              <h3>{item.label}</h3>
              <p>{item.note}</p>
            </motion.article>
          ))}
        </motion.section>

        <section className="section" id="architecture">
          <div className="section-head">
            <h2>Architecture Narrative</h2>
            <p>Designed as a trust system, not a demo UI.</p>
          </div>

          <div className="architecture-grid">
            <motion.article
              className="architecture-panel"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } } }}
            >
              {architecture.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div className="architecture-step" variants={fadeUp} key={item.title}>
                    <div className="architecture-index">0{index + 1}</div>
                    <div className="architecture-icon">
                      <Icon size={15} />
                    </div>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.article>

            <motion.article
              className="architecture-panel pathway"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
            >
              <h3>Verification Flow</h3>
              <div className="flow-node">
                <Building2 size={15} /> Institution issues credential
              </div>
              <div className="flow-node">
                <Wallet size={15} /> Holder controls sharing + consent
              </div>
              <div className="flow-node">
                <Radar size={15} /> Recruiter requests proof
              </div>
              <div className="flow-node">
                <ShieldCheck size={15} /> Chain + policy verification response
              </div>
              <p>
                This sequence supports immediate verification while preserving a path toward ZK-proof-native
                workflows.
              </p>
            </motion.article>
          </div>
        </section>

        <section className="section" id="platform">
          <div className="section-head">
            <h2>Platform Modules</h2>
            <p>Each surface is specialized, but the trust model is shared.</p>
          </div>

          <motion.div
            className="cards"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
            }}
          >
            {moduleCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.article className="card" variants={fadeUp} key={card.title}>
                  <div className="card-head">
                    <div className="icon-box">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h3>{card.title}</h3>
                      <small>{card.subtitle}</small>
                    </div>
                  </div>
                  <p>{card.description}</p>
                  <a href={card.href} target="_blank" rel="noreferrer">
                    Open Module <ArrowUpRight size={14} />
                  </a>
                </motion.article>
              );
            })}
          </motion.div>
        </section>

        <section className="section" id="audience">
          <div className="section-head">
            <h2>Conversion Tracks by Audience</h2>
            <p>Two tailored flows so institutions and hiring teams both see immediate relevance.</p>
          </div>

          <motion.div
            className="audience-grid"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.34 } } }}
          >
            {audienceTracks.map((track, index) => (
              <motion.article className="audience-card" variants={fadeUp} key={track.title}>
                <div className="audience-head">
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{track.title}</h3>
                    <small>{track.subtitle}</small>
                  </div>
                </div>

                <ul>
                  {track.points.map((point) => (
                    <li key={point}>
                      <Check size={13} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <a href="#contact">
                  {track.cta} <ArrowUpRight size={14} />
                </a>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section className="section split" id="digilocker">
          <article className="panel">
            <div className="section-head compact">
              <h2>DigiLocker Compatibility Path</h2>
              <p>India-first integration logic without weakening global standards posture.</p>
            </div>

            <ul className="list">
              {digilockerBullets.map((point) => (
                <li key={point}>
                  <Check size={14} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel bridge">
            <h3>Bridge Modules</h3>
            <div className="bridge-grid">
              <div>
                <BookCheck size={15} />
                <strong>Document Semantics</strong>
                <span>Institution records and official docs normalized for credential rails.</span>
              </div>
              <div>
                <Blocks size={15} />
                <strong>Credential Mapping</strong>
                <span>Transforms records into VC envelopes with issuer policy controls.</span>
              </div>
              <div>
                <ShieldCheck size={15} />
                <strong>Trust + Revocation</strong>
                <span>Anchoring, signature checks, and revocation state for live verification.</span>
              </div>
              <div>
                <Globe2 size={15} />
                <strong>Verifier Access</strong>
                <span>Recruiters and partners verify quickly without fragile manual workflows.</span>
              </div>
            </div>
          </article>
        </section>

        <section className="section" id="evidence">
          <div className="section-head">
            <h2>Evidence Room</h2>
            <p>Direct links for diligence, audit trails, and release confidence.</p>
          </div>

          <div className="evidence-grid">
            <article>
              <h3>Contract Proof</h3>
              <p>Active Sepolia registry contract used by current integration tests and smoke paths.</p>
              <a href={URLS.contract} target="_blank" rel="noreferrer">
                Open Contract <ExternalLink size={13} />
              </a>
            </article>

            <article>
              <h3>Transaction Proof</h3>
              <p>Issue → claim → verify flow with recorded chain evidence for reproducible validation.</p>
              <a href={URLS.tx} target="_blank" rel="noreferrer">
                Open Transaction <ExternalLink size={13} />
              </a>
            </article>

            <article>
              <h3>Pipeline Reliability</h3>
              <p>Hosted quality-gate runs and release board tracking with GO/NO-GO checkpoints.</p>
              <a href={URLS.ci} target="_blank" rel="noreferrer">
                Open CI History <ExternalLink size={13} />
              </a>
            </article>
          </div>
        </section>

        <section className="section split" id="contact">
          <article className="panel">
            <div className="section-head compact">
              <h2>Book a Pilot</h2>
              <p>Share your use-case and expected scale. We’ll return deployment architecture.</p>
            </div>

            <form className="form" onSubmit={onSubmit}>
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                required
                type="email"
                placeholder="Work Email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
              <input
                required
                placeholder="Organization"
                value={form.org}
                onChange={(event) => setForm((prev) => ({ ...prev, org: event.target.value }))}
              />
              <textarea
                required
                rows={4}
                placeholder="Use case / expected volume / compliance notes"
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              />
              <button type="submit">
                <Mail size={14} /> Send Demo Request
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
                Configure <code>VITE_DEMO_EMAIL</code> in deployment environment for direct inbox routing.
              </span>
            </div>
          </article>
        </section>
      </main>

      <footer>
        <span>CredVerse · Trust infrastructure for credentials</span>
        <a href={URLS.repo} target="_blank" rel="noreferrer">
          Source
        </a>
      </footer>
    </div>
  );
}

export default App;
