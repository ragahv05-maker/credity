#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SERVICES = [
  {
    name: "gateway",
    baseUrl: process.env.GATEWAY_URL || "http://localhost:5173",
    healthPath: "/api/health",
    metricsPath: "/api/metrics",
  },
  {
    name: "issuer",
    baseUrl: process.env.ISSUER_URL || "http://localhost:5001",
    healthPath: "/api/health",
    metricsPath: "/api/metrics",
  },
  {
    name: "wallet",
    baseUrl: process.env.WALLET_URL || "http://localhost:5002",
    healthPath: "/api/health",
    metricsPath: "/api/metrics",
  },
  {
    name: "recruiter",
    baseUrl: process.env.RECRUITER_URL || "http://localhost:5003",
    healthPath: "/api/health",
    metricsPath: "/api/metrics",
  },
];

const SAMPLE_COUNT = Number.parseInt(process.env.SLA_SAMPLE_COUNT || "5", 10);
const SAMPLE_DELAY_MS = Number.parseInt(
  process.env.SLA_SAMPLE_DELAY_MS || "300",
  10,
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

async function probe(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      durationMs: Date.now() - started,
      body,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      body: "",
      headers: {},
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runService(service) {
  const healthUrl = `${service.baseUrl.replace(/\/$/, "")}${service.healthPath}`;
  const metricsUrl = `${service.baseUrl.replace(/\/$/, "")}${service.metricsPath}`;

  const samples = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    samples.push(await probe(healthUrl));
    if (i < SAMPLE_COUNT - 1) await sleep(SAMPLE_DELAY_MS);
  }

  const success = samples.filter((s) => s.ok).length;
  const latencyValues = samples.map((s) => s.durationMs);
  const metricProbe = await probe(metricsUrl);

  const traceHeaders = samples
    .map((s) => ({
      requestId: s.headers["x-request-id"],
      traceId: s.headers["x-trace-id"] || s.headers["x-correlation-id"],
    }))
    .filter((v) => v.requestId || v.traceId);

  return {
    service: service.name,
    baseUrl: service.baseUrl,
    checks: {
      healthUrl,
      metricsUrl,
      sampleCount: SAMPLE_COUNT,
      successCount: success,
      availabilityPct:
        Math.round((success / Math.max(1, SAMPLE_COUNT)) * 10000) / 100,
      p50Ms: percentile(latencyValues, 50),
      p95Ms: percentile(latencyValues, 95),
      p99Ms: percentile(latencyValues, 99),
      maxMs: Math.max(...latencyValues),
    },
    tracePropagation: {
      observedHeaderPairs: traceHeaders.slice(0, 3),
      passed: traceHeaders.length > 0,
    },
    metricsEndpoint: {
      ok: metricProbe.ok,
      status: metricProbe.status,
      hasPrometheusShape:
        metricProbe.body.includes("# TYPE") &&
        metricProbe.body.includes("credverse_http_requests_total"),
      sample: metricProbe.body.split("\n").slice(0, 8),
    },
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Ops Telemetry SLA Dashboard");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(
    "| Service | Availability % | p95 (ms) | p99 (ms) | Metrics endpoint | Trace headers |",
  );
  lines.push("| --- | ---: | ---: | ---: | --- | --- |");
  for (const s of report.services) {
    lines.push(
      `| ${s.service} | ${s.checks.availabilityPct} | ${s.checks.p95Ms ?? "n/a"} | ${s.checks.p99Ms ?? "n/a"} | ${s.metricsEndpoint.ok ? "PASS" : `FAIL (${s.metricsEndpoint.status})`} | ${s.tracePropagation.passed ? "PASS" : "FAIL"} |`,
    );
  }
  lines.push("");
  lines.push("## SLA policy");
  lines.push("- Availability target: >= 99.0% over probe window");
  lines.push("- API latency target: p95 < 800ms, p99 < 1200ms");
  lines.push(
    "- Metrics scrapeability: /api/metrics returns Prometheus text format",
  );
  lines.push(
    "- Trace/log correlation: x-request-id and x-trace-id visible in responses/logs",
  );
  return `${lines.join("\n")}\n`;
}

const services = [];
for (const svc of SERVICES) {
  services.push(await runService(svc));
}

const report = {
  generatedAt: new Date().toISOString(),
  sampleCount: SAMPLE_COUNT,
  sampleDelayMs: SAMPLE_DELAY_MS,
  services,
};

const root = process.cwd();
const jsonPath = path.join(root, "evidence-pack/ops/telemetry-sla-latest.json");
const mdPath = path.join(root, "swarm/reports/ops-sla-dashboard-latest.md");
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.mkdirSync(path.dirname(mdPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, toMarkdown(report));

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
