#!/usr/bin/env node

/**
 * Credity lightweight performance baseline runner (S22)
 * - No external load-testing infra required
 * - Uses built-in fetch + high-resolution timers
 * - Targets critical API paths with safe default payloads
 */

import fs from "node:fs/promises";
import path from "node:path";

const cfg = {
  iterations: Number(process.env.PERF_ITERATIONS || 30),
  warmup: Number(process.env.PERF_WARMUP || 5),
  timeoutMs: Number(process.env.PERF_TIMEOUT_MS || 8000),
  outputPath:
    process.env.PERF_OUTPUT ||
    "swarm/reports/data/credity-s22-perf-baseline.json",
  gatewayBaseUrl: (
    process.env.GATEWAY_BASE_URL || "http://localhost:5173"
  ).replace(/\/$/, ""),
  walletBaseUrl: (
    process.env.WALLET_BASE_URL || "http://localhost:5002"
  ).replace(/\/$/, ""),
  issuerBaseUrl: (
    process.env.ISSUER_BASE_URL || "http://localhost:5001"
  ).replace(/\/$/, ""),
  recruiterBaseUrl: (
    process.env.RECRUITER_BASE_URL || "http://localhost:5003"
  ).replace(/\/$/, ""),
};

const scenarios = [
  {
    id: "gateway-health",
    service: "gateway",
    method: "GET",
    url: `${cfg.gatewayBaseUrl}/api/health`,
    expected: [200],
  },
  {
    id: "gateway-auth-status",
    service: "gateway",
    method: "GET",
    url: `${cfg.gatewayBaseUrl}/api/auth/status`,
    expected: [200],
  },
  {
    id: "gateway-auth-verify-token-no-token",
    service: "gateway",
    method: "POST",
    url: `${cfg.gatewayBaseUrl}/api/auth/verify-token`,
    expected: [200],
    body: {},
  },
  {
    id: "wallet-health",
    service: "wallet",
    method: "GET",
    url: `${cfg.walletBaseUrl}/api/health`,
    expected: [200],
  },
  {
    id: "wallet-auth-login-invalid",
    service: "wallet",
    method: "POST",
    url: `${cfg.walletBaseUrl}/api/v1/auth/login`,
    expected: [400, 401],
    body: { username: "perf-invalid-user", password: "perf-invalid-pass" },
  },
  {
    id: "issuer-health",
    service: "issuer",
    method: "GET",
    url: `${cfg.issuerBaseUrl}/api/health`,
    expected: [200],
  },
  {
    id: "issuer-auth-login-invalid",
    service: "issuer",
    method: "POST",
    url: `${cfg.issuerBaseUrl}/api/v1/auth/login`,
    expected: [400, 401],
    body: { email: "perf.invalid@example.com", password: "perf-invalid-pass" },
  },
  {
    id: "recruiter-health",
    service: "recruiter",
    method: "GET",
    url: `${cfg.recruiterBaseUrl}/api/health`,
    expected: [200],
  },
  {
    id: "recruiter-auth-login-invalid",
    service: "recruiter",
    method: "POST",
    url: `${cfg.recruiterBaseUrl}/api/auth/login`,
    expected: [400, 401],
    body: { email: "perf.invalid@example.com", password: "perf-invalid-pass" },
  },
  {
    id: "recruiter-proofs-verify-invalid-input",
    service: "recruiter",
    method: "POST",
    url: `${cfg.recruiterBaseUrl}/api/v1/proofs/verify`,
    expected: [400],
    body: { proof: null },
  },
];

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function summary(samples) {
  if (!samples.length) {
    return {
      count: 0,
      minMs: null,
      maxMs: null,
      avgMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
    };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    minMs: Number(sorted[0].toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    avgMs: Number((total / sorted.length).toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
    p99Ms: Number(percentile(sorted, 99).toFixed(2)),
  };
}

async function oneRequest(scenario) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const start = process.hrtime.bigint();
  let status = 0;
  let ok = false;
  let error = null;

  try {
    const res = await fetch(scenario.url, {
      method: scenario.method,
      headers: {
        "content-type": "application/json",
        ...(scenario.headers || {}),
      },
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
      signal: controller.signal,
    });
    status = res.status;
    ok = scenario.expected.includes(status);
    await res.arrayBuffer();
  } catch (e) {
    error = e?.name === "AbortError" ? "timeout" : e?.message || String(e);
  } finally {
    clearTimeout(timeout);
  }

  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  return {
    elapsedMs: Number(elapsedMs.toFixed(2)),
    status,
    ok,
    error,
  };
}

async function runScenario(scenario) {
  const results = [];

  for (let i = 0; i < cfg.warmup; i += 1) {
    await oneRequest(scenario);
  }

  for (let i = 0; i < cfg.iterations; i += 1) {
    const r = await oneRequest(scenario);
    results.push(r);
  }

  const latencySamples = results.filter((r) => r.ok).map((r) => r.elapsedMs);
  const failures = results
    .filter((r) => !r.ok)
    .map((r) => ({ status: r.status, error: r.error }));
  const successCount = latencySamples.length;
  const totalCount = results.length;

  return {
    scenarioId: scenario.id,
    service: scenario.service,
    method: scenario.method,
    url: scenario.url,
    expectedStatuses: scenario.expected,
    totalCount,
    successCount,
    failureCount: totalCount - successCount,
    successRate: Number(
      ((successCount / Math.max(1, totalCount)) * 100).toFixed(2),
    ),
    latency: summary(latencySamples),
    failures: failures.slice(0, 10),
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const run = {
    startedAt,
    config: cfg,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    scenarios: [],
  };

  for (const s of scenarios) {
    // eslint-disable-next-line no-console
    console.log(
      `Running ${s.id} (${cfg.iterations} iters + ${cfg.warmup} warmup)`,
    );
    const result = await runScenario(s);
    run.scenarios.push(result);
    // eslint-disable-next-line no-console
    console.log(
      `  -> successRate=${result.successRate}% p95=${result.latency.p95Ms ?? "n/a"}ms`,
    );
  }

  run.completedAt = new Date().toISOString();

  const outPath = path.resolve(process.cwd(), cfg.outputPath);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(run, null, 2), "utf8");

  // eslint-disable-next-line no-console
  console.log(`\nSaved baseline JSON to: ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[perf-baseline] failed:", err);
  process.exitCode = 1;
});
