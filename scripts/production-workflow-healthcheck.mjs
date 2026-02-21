#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

function add(name, pass, detail) {
  checks.push({ name, pass, detail });
}

const launchEnv = read(".env.launch.example");
const envKeys = new Set(
  [...launchEnv.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]),
);

for (const key of [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "REDIS_URL",
  "SENTRY_DSN",
  "NODE_ENV",
  "ALLOW_DEMO_ROUTES",
  "REQUIRE_DATABASE",
  "REQUIRE_QUEUE",
  "ISSUER_KEY_ENCRYPTION",
  "RELAYER_PRIVATE_KEY",
  "REGISTRY_CONTRACT_ADDRESS",
  "SEPOLIA_RPC_URL",
]) {
  add(`env template includes ${key}`, envKeys.has(key), ".env.launch.example");
}

const smoke = read("scripts/infra-live-smoke.sh");
for (const token of [
  ': "${GATEWAY_URL:?missing}"',
  ': "${ISSUER_URL:?missing}"',
  ': "${WALLET_URL:?missing}"',
  ': "${RECRUITER_URL:?missing}"',
  "/api/health/relayer",
]) {
  add(
    `infra smoke enforces ${token}`,
    smoke.includes(token),
    "scripts/infra-live-smoke.sh",
  );
}

const rollbackRunbook = read("docs/runbooks/rollback.md");
add(
  "rollback runbook has scenario-specific sections",
  rollbackRunbook.includes("### A) Auth rollback") &&
    rollbackRunbook.includes("### D) Gateway proxy rollback"),
  "docs/runbooks/rollback.md",
);

const cutover = read("docs/runbooks/production-cutover-package.md");
add(
  "cutover package includes Railway rollback method",
  cutover.includes("Railway: rollback each affected service"),
  "docs/runbooks/production-cutover-package.md",
);
add(
  "cutover package includes Vercel rollback method",
  cutover.includes("Vercel: promote previous stable deployment"),
  "docs/runbooks/production-cutover-package.md",
);

add(
  "launch gate workflow exists",
  exists(".github/workflows/launch-gate.yml"),
  ".github/workflows/launch-gate.yml",
);

let failed = 0;
for (const c of checks) {
  const status = c.pass ? "PASS" : "FAIL";
  if (!c.pass) failed += 1;
  console.log(`[${status}] ${c.name} - ${c.detail}`);
}

if (failed > 0) {
  console.error(`\nProduction workflow healthcheck failed (${failed} checks).`);
  process.exit(1);
}

console.log("\nProduction workflow healthcheck passed.");
