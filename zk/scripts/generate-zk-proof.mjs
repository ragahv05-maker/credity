import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const circuits = [
  "score_threshold",
  "age_verification",
  "cross_vertical_aggregate",
];
const root = process.cwd();

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function ensureSetup() {
  const missing = circuits.some(
    (circuit) =>
      !existsSync(
        path.join(root, "artifacts", circuit, `${circuit}_final.zkey`),
      ),
  );
  if (missing) {
    run("npm run setup:groth16");
    run("npm run artifacts:validate");
  }
}

function proveCircuit(circuit, inputPathArg) {
  const base = path.join(root, "artifacts", circuit);
  const wasm = path.join(base, `${circuit}_js`, `${circuit}.wasm`);
  const zkey = path.join(base, `${circuit}_final.zkey`);
  const inputPath =
    inputPathArg || path.join(root, "inputs", `${circuit}.json`);
  const proofOut = path.join(base, "proof.json");
  const publicOut = path.join(base, "public.json");

  if (!existsSync(inputPath)) {
    throw new Error(`Missing proof input for ${circuit}: ${inputPath}`);
  }
  if (!existsSync(wasm) || !existsSync(zkey)) {
    throw new Error(
      `Missing wasm/zkey for ${circuit}. Run: npm run build:circuits && npm run setup:groth16`,
    );
  }

  run(
    `snarkjs groth16 fullprove ${inputPath} ${wasm} ${zkey} ${proofOut} ${publicOut}`,
  );
  run(
    `snarkjs groth16 verify ${path.join(base, "verification_key.json")} ${publicOut} ${proofOut}`,
  );

  console.log(`Generated proof: ${proofOut}`);
  console.log(`Generated public signals: ${publicOut}`);
}

const circuit = process.argv[2];
const inputPath = process.argv[3];

ensureSetup();

if (circuit) {
  proveCircuit(circuit, inputPath);
} else {
  for (const name of circuits) {
    proveCircuit(name);
  }
}
