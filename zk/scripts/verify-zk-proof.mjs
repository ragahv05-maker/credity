import { execSync } from "node:child_process";
import path from "node:path";

const circuits = [
  "score_threshold",
  "age_verification",
  "cross_vertical_aggregate",
];
const single = process.argv[2];
const selected = single ? [single] : circuits;

for (const circuit of selected) {
  const base = path.join(process.cwd(), "artifacts", circuit);
  const vkey = path.join(base, "verification_key.json");
  const publicOut = path.join(base, "public.json");
  const proofOut = path.join(base, "proof.json");

  execSync(`snarkjs groth16 verify ${vkey} ${publicOut} ${proofOut}`, {
    stdio: "inherit",
  });
}
