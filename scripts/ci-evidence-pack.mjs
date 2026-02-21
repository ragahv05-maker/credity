#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...rest] = arg.replace(/^--/, "").split("=");
    return [k, rest.join("=") || ""];
  }),
);

const nowIst = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Calcutta",
  dateStyle: "medium",
  timeStyle: "medium",
}).format(new Date());

const sha = args.sha || process.env.GITHUB_SHA || "<commit-sha>";
const releaseRef = args.ref || process.env.GITHUB_REF || "<release-ref>";
const qualityRun = args.qualityRun || "<quality-gates-run-url>";
const contractRun = args.contractRun || "<contract-security-run-url>";
const launchRun = args.launchRun || "<launch-gate-run-url>";
const outFile = args.out || "swarm/reports/ci-evidence-pack.latest.md";

const content = `# CI Evidence Pack (Hosted)\n\nGenerated: ${nowIst} (IST)\n\n## Release metadata\n- Commit SHA: ${sha}\n- Release ref: ${releaseRef}\n\n## Hosted workflow links\n- quality-gates-ci: ${qualityRun}\n- contract-security-ci: ${contractRun}\n- launch-gate: ${launchRun}\n\n## Artifact checklist\n- [ ] quality-gates-evidence-<run_id> artifact downloaded/linked\n- [ ] contract-security-evidence-<run_id> artifact downloaded/linked\n- [ ] launch-gate-evidence-<run_id> artifact downloaded/linked\n\n## GO/NO-GO mapping (S28)\n- P0-03 Cross-service quality gates pass\n  - Evidence: quality-gates-ci run + launch-gate run\n  - Status: [ ] DONE [ ] PARTIAL [ ] OPEN [ ] BLOCKED\n- P0-04 CI release workflow validation on GitHub Actions\n  - Evidence: quality-gates-ci green run URL + artifact\n  - Status: [ ] DONE [ ] PARTIAL [ ] OPEN [ ] BLOCKED\n- P0-05 Security high/critical sweep\n  - Evidence: dependency-security + contracts-security job results from quality-gates + contract-security-ci\n  - Status: [ ] DONE [ ] PARTIAL [ ] OPEN [ ] BLOCKED\n\n## Notes\n- Paste this section into swarm/reports/credity-s28-release-board.md Evidence/Notes column.\n- For final release board decision, mark GO only when all P0 rows are DONE.\n`;

const abs = path.resolve(process.cwd(), outFile);
fs.mkdirSync(path.dirname(abs), { recursive: true });
fs.writeFileSync(abs, content, "utf8");
console.log(`Wrote ${abs}`);
