import { execSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const circuits = [
  "score_threshold",
  "age_verification",
  "cross_vertical_aggregate",
];
const root = process.cwd();
const artifactsRoot = path.join(root, "artifacts");
const ptau = path.join(artifactsRoot, "powersOfTau28_hez_final_12.ptau");

function sha256(filePath) {
  const content = readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

if (!existsSync(ptau)) {
  mkdirSync(artifactsRoot, { recursive: true });
  const ptau0 = path.join(artifactsRoot, "powersOfTau28_hez_12_0000.ptau");
  const ptau1 = path.join(artifactsRoot, "powersOfTau28_hez_12_0001.ptau");
  execSync(`snarkjs powersoftau new bn128 12 ${ptau0} -v`, {
    stdio: "inherit",
  });
  execSync(
    `snarkjs powersoftau contribute ${ptau0} ${ptau1} --name="credity-ptau" -v -e="credity-ptau-deterministic"`,
    {
      stdio: "inherit",
    },
  );
  execSync(`snarkjs powersoftau prepare phase2 ${ptau1} ${ptau} -v`, {
    stdio: "inherit",
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  ptau: {
    file: path.relative(root, ptau),
    sha256: sha256(ptau),
  },
  circuits: {},
};

for (const circuit of circuits) {
  const base = path.join(artifactsRoot, circuit);
  mkdirSync(base, { recursive: true });

  const r1cs = path.join(base, `${circuit}.r1cs`);
  if (!existsSync(r1cs)) {
    throw new Error(
      `Missing r1cs for ${circuit}: ${r1cs}. Run npm run build:circuits first.`,
    );
  }

  const zkey0 = path.join(base, `${circuit}_0000.zkey`);
  const zkey = path.join(base, `${circuit}_final.zkey`);
  const vkey = path.join(base, "verification_key.json");

  execSync(`snarkjs groth16 setup ${r1cs} ${ptau} ${zkey0}`, {
    stdio: "inherit",
  });
  execSync(
    `snarkjs zkey contribute ${zkey0} ${zkey} --name="credity-batch2" -v -e="credity-zk-batch2-entropy"`,
    {
      stdio: "inherit",
    },
  );
  execSync(`snarkjs zkey export verificationkey ${zkey} ${vkey}`, {
    stdio: "inherit",
  });

  manifest.circuits[circuit] = {
    r1cs: { file: path.relative(root, r1cs), sha256: sha256(r1cs) },
    zkey: { file: path.relative(root, zkey), sha256: sha256(zkey) },
    vkey: { file: path.relative(root, vkey), sha256: sha256(vkey) },
  };
}

const manifestPath = path.join(artifactsRoot, "manifest.groth16.json");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Wrote artifact manifest: ${manifestPath}`);
