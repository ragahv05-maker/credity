import { performance } from 'node:perf_hooks';

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
  return {
    samples: values.length,
    avgMs: avg,
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    maxMs: sorted[sorted.length - 1] ?? 0,
  };
}

function calculateTrustScore(input) {
  const identity = (input.livenessVerified ? 15 : 0)
    + (input.documentVerified ? 10 : 0)
    + (input.biometricsSetup ? 10 : 0)
    + (input.digilockerConnected ? 5 : 0);
  const activity = Math.min(input.totalCredentials * 2, 10)
    + Math.min(input.totalVerifications * 2, 10)
    + Math.min(input.platformConnectionCount * 2, 10);
  const flagPenalty = input.suspiciousActivityFlags * 10;
  const endorsementPoints = Math.min(input.endorsementCount * 3, 15);
  const positiveFeedback = Math.min(input.positiveFeedbackCount * 2, 10);
  const negativeFeedback = input.negativeFeedbackCount * 5;
  const feedbackPoints = Math.max(0, positiveFeedback - negativeFeedback);
  const reputation = Math.max(0, Math.min(30, (30 - flagPenalty) + endorsementPoints + feedbackPoints - 15));
  return identity + activity + reputation;
}

const CATEGORY_WEIGHTS = {
  transport: 15,
  accommodation: 15,
  delivery: 10,
  employment: 20,
  finance: 15,
  social: 10,
  identity: 15,
};

function computeReputationScore(events) {
  const categories = Object.keys(CATEGORY_WEIGHTS);
  let score100 = 0;
  for (const category of categories) {
    const list = events.filter((e) => e.category === category);
    const avg = list.length
      ? Math.round(list.reduce((s, e) => s + e.score, 0) / list.length)
      : 0;
    score100 += Math.round((avg * CATEGORY_WEIGHTS[category]) / 100);
  }
  return Math.max(0, Math.min(1000, Math.round(score100 * 10)));
}

function evaluateWorkScore(payload) {
  const w = { identity: 250, education: 150, employment: 200, reputation: 200, skills: 100, crossTrust: 100 };
  const c = payload.components;
  const score = Math.round(w.identity * c.identity)
    + Math.round(w.education * c.education)
    + Math.round(w.employment * c.employment)
    + Math.round(w.reputation * c.reputation)
    + Math.round(w.skills * c.skills)
    + Math.round(w.crossTrust * c.crossTrust);
  return score;
}

async function measureAsyncReputationUpdate(samples = 40) {
  const updateLatencies = [];
  for (let i = 0; i < samples; i += 1) {
    const state = { scoreReady: false };
    const t0 = performance.now();

    setImmediate(() => {
      // Simulate async recalc after event ingest
      computeReputationScore([{ category: 'employment', score: 92 }]);
      state.scoreReady = true;
    });

    while (!state.scoreReady) {
      await new Promise((r) => setTimeout(r, 1));
    }
    updateLatencies.push(performance.now() - t0);
  }
  return summarize(updateLatencies);
}

export async function runHarness() {
  const trustTimes = [];
  const trustInput = {
    livenessVerified: true,
    documentVerified: true,
    biometricsSetup: true,
    digilockerConnected: true,
    totalCredentials: 14,
    totalVerifications: 12,
    platformConnectionCount: 5,
    suspiciousActivityFlags: 0,
    endorsementCount: 7,
    positiveFeedbackCount: 8,
    negativeFeedbackCount: 1,
  };
  for (let i = 0; i < 10000; i += 1) {
    const t0 = performance.now();
    calculateTrustScore(trustInput);
    trustTimes.push(performance.now() - t0);
  }

  const repEvents = Array.from({ length: 300 }, (_, i) => ({
    category: i % 2 === 0 ? 'employment' : 'identity',
    score: 70 + (i % 30),
  }));
  const repTimes = [];
  for (let i = 0; i < 2000; i += 1) {
    const t0 = performance.now();
    computeReputationScore(repEvents);
    repTimes.push(performance.now() - t0);
  }

  const workPayload = {
    components: {
      identity: 0.94,
      education: 0.9,
      employment: 0.88,
      reputation: 0.91,
      skills: 0.87,
      crossTrust: 0.9,
    },
  };
  const workTimes = [];
  for (let i = 0; i < 10000; i += 1) {
    const t0 = performance.now();
    evaluateWorkScore(workPayload);
    workTimes.push(performance.now() - t0);
  }

  const sync = await measureAsyncReputationUpdate(80);

  return {
    generatedAt: new Date().toISOString(),
    targetMs: 1000,
    metrics: {
      trustComputeMs: summarize(trustTimes),
      reputationComputeMs: summarize(repTimes),
      workscoreComputeMs: summarize(workTimes),
      reputationSyncUpdateMs: sync,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await runHarness();
  console.log(JSON.stringify(out, null, 2));
}
