#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidenceDir = path.join(root, "ci-evidence");
const rows = [];

const run = (label, command, cwd = root) => {
  const startedAt = Date.now();
  try {
    execSync(command, { stdio: "inherit", cwd, env: process.env });
    rows.push({
      label,
      command,
      status: "pass",
      durationSec: ((Date.now() - startedAt) / 1000).toFixed(1),
    });
  } catch (error) {
    rows.push({
      label,
      command,
      status: "fail",
      durationSec: ((Date.now() - startedAt) / 1000).toFixed(1),
      code: error?.status ?? 1,
    });
    throw error;
  }
};

const maybeRun = (label, command, cwd, existsPath) => {
  if (!fs.existsSync(path.join(root, existsPath))) {
    rows.push({ label, command, status: "skip", durationSec: "0.0" });
    return;
  }
  run(label, command, cwd);
};

try {
  maybeRun(
    "policy-rules package tests",
    "npm ci && npm test",
    path.join(root, "packages/policy-rules"),
    "packages/policy-rules/package.json",
  );

  maybeRun(
    "workflows-temporal package tests",
    "npm ci && npm test",
    path.join(root, "packages/workflows-temporal"),
    "packages/workflows-temporal/package.json",
  );

  maybeRun(
    "wallet dispute SLA suite",
    "npm test -- tests/reputation-dispute-sla.test.ts",
    path.join(root, "BlockWalletDigi"),
    "BlockWalletDigi/tests/reputation-dispute-sla.test.ts",
  );

  maybeRun(
    "recruiter WorkScore SLA suite",
    "npm test -- tests/workscore-5min-sla.test.ts",
    path.join(root, "CredVerseRecruiter"),
    "CredVerseRecruiter/tests/workscore-5min-sla.test.ts",
  );

  maybeRun(
    "wallet gig fast-track contract suite",
    "npm test -- tests/gig-fasttrack-contract.test.ts",
    path.join(root, "BlockWalletDigi"),
    "BlockWalletDigi/tests/gig-fasttrack-contract.test.ts",
  );
} finally {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const summary = [
    "# OSS Readiness Gate Summary",
    "",
    `- Timestamp: ${new Date().toISOString()}`,
    "",
    "## Results",
    ...rows.map(
      (r) =>
        `- ${r.status === "pass" ? "✅" : r.status === "skip" ? "⏭️" : "❌"} ${r.label} (${r.durationSec}s) — \`${r.command}\``,
    ),
    "",
  ].join("\n");
  fs.writeFileSync(
    path.join(evidenceDir, "oss-readiness-summary.md"),
    summary,
    "utf8",
  );
}
