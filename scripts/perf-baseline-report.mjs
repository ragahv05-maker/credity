#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(
  process.cwd(),
  process.env.PERF_INPUT || "swarm/reports/data/credity-s22-perf-baseline.json",
);
const outputPath = resolve(
  process.cwd(),
  process.env.PERF_MARKDOWN_OUTPUT ||
    "swarm/reports/data/credity-s22-perf-baseline-table.md",
);

function fmt(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "n/a";
  return n.toFixed(2);
}

function pct(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "n/a";
  return `${(n * 100).toFixed(1)}%`;
}

let raw;
try {
  raw = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (error) {
  console.error(
    `Failed to read perf baseline JSON at ${inputPath}: ${error.message}`,
  );
  process.exit(1);
}

const scenarios = Array.isArray(raw?.scenarios)
  ? raw.scenarios
  : Array.isArray(raw)
    ? raw
    : [];

if (!scenarios.length) {
  console.error("No scenarios found in baseline data.");
  process.exit(1);
}

const lines = [
  "| Scenario | Success Rate | p50 (ms) | p95 (ms) | p99 (ms) | Avg (ms) |",
  "|---|---:|---:|---:|---:|---:|",
];

for (const s of scenarios) {
  const name = s.name || s.scenario || "unknown";
  const successRate = s.successRate ?? s.success_rate;
  const p50 = s.p50Ms ?? s.p50 ?? s.latency?.p50;
  const p95 = s.p95Ms ?? s.p95 ?? s.latency?.p95;
  const p99 = s.p99Ms ?? s.p99 ?? s.latency?.p99;
  const avg = s.avgMs ?? s.avg ?? s.latency?.avg;

  lines.push(
    `| ${name} | ${pct(successRate)} | ${fmt(p50)} | ${fmt(p95)} | ${fmt(p99)} | ${fmt(avg)} |`,
  );
}

const output = `${lines.join("\n")}\n`;
writeFileSync(outputPath, output, "utf8");
console.log(`Wrote markdown table to ${outputPath}`);
