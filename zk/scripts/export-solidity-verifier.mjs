import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const allowedCircuits = new Set([
  "score_threshold",
  "age_verification",
  "cross_vertical_aggregate",
]);
const circuit = process.argv[2] || "score_threshold";

if (!allowedCircuits.has(circuit)) {
  throw new Error(
    `Unsupported circuit '${circuit}'. Allowed: ${Array.from(allowedCircuits).join(", ")}`,
  );
}

const root = process.cwd();
const base = path.join(root, "artifacts", circuit);
const zkey = path.join(base, `${circuit}_final.zkey`);
const manifestPath = path.join(root, "artifacts", "manifest.groth16.json");

if (!existsSync(zkey)) {
  throw new Error(`Missing zkey: ${zkey}. Run npm run setup:groth16 first.`);
}

if (!existsSync(manifestPath)) {
  throw new Error(
    `Missing artifact manifest: ${manifestPath}. Run npm run setup:groth16 first.`,
  );
}

const outDir = path.join(
  root,
  "..",
  "CredVerseIssuer 3",
  "contracts",
  "contracts",
  "zk",
);
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `GeneratedGroth16Verifier_${circuit}.sol`);

execSync(`snarkjs zkey export solidityverifier "${zkey}" "${out}"`, {
  stdio: "inherit",
});

const indexPath = path.join(outDir, "generated-verifiers.json");
const current = existsSync(indexPath)
  ? JSON.parse(readFileSync(indexPath, "utf8"))
  : { updatedAt: null, verifiers: {} };

current.updatedAt = new Date().toISOString();
current.verifiers[circuit] = path.relative(path.join(root, ".."), out);
writeFileSync(indexPath, JSON.stringify(current, null, 2) + "\n", "utf8");

console.log(`Exported verifier: ${out}`);
console.log(`Updated verifier index: ${indexPath}`);
