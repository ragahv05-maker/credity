#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

const services = [
  {
    name: "BlockWalletDigi",
    dir: "BlockWalletDigi",
    migrationsDir: "migrations",
    drizzleOut: "migrations",
  },
  {
    name: "CredVerseIssuer",
    dir: "CredVerseIssuer 3",
    migrationsDir: "drizzle",
    drizzleOut: "drizzle",
  },
  {
    name: "CredVerseRecruiter",
    dir: "CredVerseRecruiter",
    migrationsDir: "migrations",
    drizzleOut: "migrations",
  },
];

const destructivePatterns = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+CONSTRAINT\b/i,
  /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
];

const warnings = [];
const errors = [];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function collectSqlFiles(dir) {
  const out = [];
  if (!(await exists(dir))) return out;

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(current, e.name);
      if (e.isDirectory()) {
        await walk(abs);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".sql")) {
        out.push(abs);
      }
    }
  }

  await walk(dir);
  return out;
}

for (const service of services) {
  const serviceRoot = path.join(repoRoot, service.dir);
  const migrationsPath = path.join(serviceRoot, service.migrationsDir);

  if (!(await exists(migrationsPath))) {
    warnings.push(
      `${service.name}: no ${service.migrationsDir}/ directory yet (no committed SQL migration history).`,
    );
    continue;
  }

  const sqlFiles = await collectSqlFiles(migrationsPath);
  if (sqlFiles.length === 0) {
    warnings.push(
      `${service.name}: ${service.migrationsDir}/ exists but has no .sql files.`,
    );
    continue;
  }

  for (const file of sqlFiles) {
    const text = await fs.readFile(file, "utf8");
    for (const pattern of destructivePatterns) {
      if (pattern.test(text)) {
        errors.push(
          `${service.name}: ${path.relative(repoRoot, file)} contains potentially destructive SQL: ${pattern}`,
        );
      }
    }
  }
}

console.log("DB migration safety check");
console.log("=========================");
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);

if (errors.length > 0) {
  console.error("\nFailed: destructive migration patterns found.");
  process.exit(2);
}

console.log(
  "\nPassed: no destructive SQL patterns detected in committed migrations.",
);
if (warnings.length > 0) {
  console.log(
    "Note: warnings indicate missing migration history/dirs and should be resolved before production rollout.",
  );
}
