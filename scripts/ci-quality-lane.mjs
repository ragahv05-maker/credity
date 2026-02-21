#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
const mode = (
  modeArg?.split("=")[1] ||
  process.env.CI_QUALITY_MODE ||
  "full"
).toLowerCase();
const root = process.cwd();
const evidenceDir = path.join(root, "ci-evidence");

const run = (label, command) => {
  const startedAt = Date.now();
  try {
    execSync(command, { stdio: "inherit", cwd: root, env: process.env });
    return {
      label,
      command,
      status: "pass",
      durationSec: ((Date.now() - startedAt) / 1000).toFixed(1),
    };
  } catch (error) {
    return {
      label,
      command,
      status: "fail",
      durationSec: ((Date.now() - startedAt) / 1000).toFixed(1),
      code: error?.status ?? 1,
    };
  }
};

const steps = [
  ["Install root deps", "npm ci"],
  ["Lint gate", "npm run lint"],
  ["Type/build check gate", "npm run check"],
  ["Test gate", "npm run test"],
];

if (mode === "full") {
  steps.push(["Launch docs/config strict gate", "npm run gate:launch:strict"]);
}

const results = steps.map(([label, command]) => run(label, command));
const failed = results.find((result) => result.status === "fail");

fs.mkdirSync(evidenceDir, { recursive: true });
const summaryPath = path.join(evidenceDir, "local-quality-lane-summary.md");
const summary = [
  "# Local CI Quality Lane Summary",
  "",
  `- Mode: ${mode}`,
  `- Timestamp: ${new Date().toISOString()}`,
  "",
  "## Results",
  ...results.map(
    (result) =>
      `- ${result.status === "pass" ? "✅" : "❌"} ${result.label} (${result.durationSec}s) — \`${result.command}\``,
  ),
  "",
].join("\n");

fs.writeFileSync(summaryPath, summary, "utf8");
console.log(`\nWrote ${summaryPath}`);

if (failed) {
  process.exit(Number(failed.code) || 1);
}
