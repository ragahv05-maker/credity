#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const startupEnv = {
  NODE_ENV: "development",
  ALLOW_DEMO_ROUTES: "false",
  REQUIRE_DATABASE: "false",
  REQUIRE_QUEUE: "false",
  BLOCKCHAIN_ANCHOR_MODE: "async",
  ISSUER_BOOTSTRAP_API_KEY:
    process.env.ISSUER_BOOTSTRAP_API_KEY || "test-api-key",
};

const services = [
  {
    name: "issuer",
    cwd: path.join(repoRoot, "CredVerseIssuer 3"),
    cmd: [npmCmd, "run", "dev"],
    env: { PORT: "5001", ...startupEnv },
    healthUrl: "http://localhost:5001/api/health",
  },
  {
    name: "wallet",
    cwd: path.join(repoRoot, "BlockWalletDigi"),
    cmd: [npmCmd, "run", "dev"],
    env: { PORT: "5002", ...startupEnv },
    healthUrl: "http://localhost:5002/api/health",
  },
  {
    name: "recruiter",
    cwd: path.join(repoRoot, "CredVerseRecruiter"),
    cmd: [npmCmd, "run", "dev"],
    env: { PORT: "5003", ...startupEnv },
    healthUrl: "http://localhost:5003/api/health",
  },
  {
    name: "gateway",
    cwd: path.join(repoRoot, "credverse-gateway"),
    cmd: [npmCmd, "run", "dev:server"],
    env: { PORT: "5173", ...startupEnv },
    healthUrl: "http://localhost:5173/api/health",
  },
];

const running = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(name, message) {
  process.stdout.write(`[${name}] ${message}\n`);
}

function spawnService(def) {
  const [command, ...args] = def.cmd;
  const child = spawn(command, args, {
    cwd: def.cwd,
    env: {
      ...process.env,
      ...def.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) log(def.name, text);
  });
  child.stderr.on("data", (chunk) => {
    const text = String(chunk).trim();
    if (text) log(def.name, text);
  });

  child.on("exit", (code, signal) => {
    log(def.name, `exited (code=${code ?? "null"} signal=${signal ?? "null"})`);
  });

  running.push(child);
  return child;
}

async function waitForHealth(name, url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        log(name, `healthy at ${url}`);
        return;
      }
    } catch {
      // retry until timeout
    }
    await sleep(1500);
  }
  throw new Error(
    `${name} did not become healthy at ${url} within ${timeoutMs}ms`,
  );
}

function terminateChildren() {
  for (const child of running) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

async function runGate() {
  return new Promise((resolve, reject) => {
    const gate = spawn("node", ["scripts/foundation-e2e-gate.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ISSUER_BASE_URL: "http://localhost:5001",
        WALLET_BASE_URL: "http://localhost:5002",
        RECRUITER_BASE_URL: "http://localhost:5003",
        E2E_ISSUER_API_KEY:
          process.env.E2E_ISSUER_API_KEY ||
          process.env.ISSUER_BOOTSTRAP_API_KEY ||
          "test-api-key",
      },
      stdio: "inherit",
    });

    gate.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`foundation gate exited with code ${code}`));
      }
    });
    gate.on("error", reject);
  });
}

async function main() {
  process.on("SIGINT", () => {
    terminateChildren();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    terminateChildren();
    process.exit(143);
  });

  try {
    log("orchestrator", "starting local services for foundation gate...");
    for (const service of services) {
      spawnService(service);
    }

    for (const service of services) {
      await waitForHealth(service.name, service.healthUrl);
    }

    log("orchestrator", "all services healthy. running foundation gate...");
    await runGate();
    log("orchestrator", "foundation gate completed successfully.");
  } finally {
    terminateChildren();
    await sleep(800);
  }
}

main().catch((error) => {
  process.stderr.write(
    `[orchestrator] failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
