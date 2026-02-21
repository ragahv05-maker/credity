import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const manifestPath = path.join(root, "artifacts", "manifest.groth16.json");

if (!existsSync(manifestPath)) {
  throw new Error(`Missing manifest: ${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function sha256(filePath) {
  const content = readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function assertHash(entry, label) {
  const filePath = path.join(root, entry.file);
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
  const actual = sha256(filePath);
  if (actual !== entry.sha256) {
    throw new Error(
      `Checksum mismatch for ${label}: expected ${entry.sha256}, got ${actual}`,
    );
  }
}

assertHash(manifest.ptau, "ptau");

for (const [circuit, files] of Object.entries(manifest.circuits || {})) {
  assertHash(files.r1cs, `${circuit}.r1cs`);
  assertHash(files.zkey, `${circuit}.zkey`);
  assertHash(files.vkey, `${circuit}.verification_key`);
}

console.log("Artifact manifest validation passed.");
