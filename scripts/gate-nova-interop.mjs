#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const checks = [
  {
    name: "trust-sdk verify contract conformance",
    cwd: "packages/trust-sdk",
    command: ["npm", "test"],
  },
  {
    name: "wallet consumer reputation contract conformance",
    cwd: "BlockWalletDigi",
    command: [
      "npx",
      "vitest",
      "run",
      "tests/consumer-reputation-contracts.test.ts",
      "tests/reputation-route-summary.test.ts",
    ],
  },
  {
    name: "issuer reputation graph contract conformance",
    cwd: "CredVerseIssuer 3",
    command: [
      "npx",
      "vitest",
      "run",
      "tests/reputation-graph-event-mapper.test.ts",
      "tests/reputation-graph.test.ts",
      "tests/reputation-route-graph.test.ts",
    ],
  },
  {
    name: "recruiter workscore + safedate contract conformance",
    cwd: "CredVerseRecruiter",
    command: [
      "npx",
      "vitest",
      "run",
      "tests/workscore.test.ts",
      "tests/workscore-route.test.ts",
      "tests/safedate.test.ts",
      "tests/safedate-route.test.ts",
    ],
  },
];

let failed = 0;
for (const check of checks) {
  console.log(`\n[gate] ${check.name}`);
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: check.cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status === 0) {
    console.log(`[PASS] ${check.name}`);
  } else {
    failed += 1;
    console.error(`[FAIL] ${check.name}`);
  }
}

if (failed > 0) {
  console.error(
    `\nNOVA interop gate failed (${failed} check${failed === 1 ? "" : "s"}).`,
  );
  process.exit(1);
}

console.log("\nNOVA interop gate passed.");
