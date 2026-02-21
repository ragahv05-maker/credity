#!/usr/bin/env node
/**
 * Extracts PRD features (#### Feature X: ...) and writes tracker artifacts.
 * Outputs:
 * - credverse-gateway/public/progress/prd.json
 * - credverse-gateway/public/progress/prd-feature-tracker.json
 * - credverse-gateway/public/progress/prd-feature-tracker.csv
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const prdPath = path.join(ROOT, "information__critical ", "PRD.md");
const statusPath = path.join(
  ROOT,
  "AEOS_Memory",
  "Operational_Memory",
  "prd-feature-status.json",
);
const evidencePath = path.join(
  ROOT,
  "AEOS_Memory",
  "Operational_Memory",
  "prd-feature-evidence.json",
);
const outDir = path.join(ROOT, "credverse-gateway", "public", "progress");
const outPath = path.join(outDir, "prd.json");
const trackerJsonPath = path.join(outDir, "prd-feature-tracker.json");
const trackerCsvPath = path.join(outDir, "prd-feature-tracker.csv");

const prd = fs.readFileSync(prdPath, "utf8");
const re = /^#### Feature\s+(\d+)\s*:\s*(.+?)\s*$/gm;
const features = [];
let m;
while ((m = re.exec(prd))) {
  const index = Number(m[1]);
  const name = m[2].trim();
  const key = name.replace(/\s*🆕\s*$/, "").trim();
  features.push({ index, name, key });
}

let status = { features: {} };
if (fs.existsSync(statusPath))
  status = JSON.parse(fs.readFileSync(statusPath, "utf8"));

let evidence = { features: {} };
if (fs.existsSync(evidencePath))
  evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));

const scoreMap = { DONE: 1, PARTIAL: 0.5, NOT_STARTED: 0 };
let total = 0;
let achieved = 0;
const items = features.map((feature, idx) => {
  total += 1;
  const st = (status.features && status.features[feature.key]) || "NOT_STARTED";
  achieved += scoreMap[st] ?? 0;
  return {
    featureId: `F${String(idx + 1).padStart(2, "0")}`,
    featureNumber: feature.index,
    feature: feature.name,
    status: st,
    evidence: evidence.features?.[feature.key]?.evidence || [],
    evidenceNote: evidence.features?.[feature.key]?.note || "",
  };
});

const pct = total ? Math.round((achieved / total) * 1000) / 10 : 0;
const withEvidence = items.filter((it) => it.evidence.length > 0).length;

const out = {
  generatedAt: new Date().toISOString(),
  totalFeatures: total,
  achievedScore: achieved,
  prdCompletionPct: pct,
  mappedEvidenceFeatures: withEvidence,
  items: items.map(({ feature, status }) => ({ name: feature, status })),
};

const tracker = {
  generatedAt: new Date().toISOString(),
  totalFeatures: total,
  mappedEvidenceFeatures: withEvidence,
  items,
};

const csvHeader = [
  "featureId",
  "featureNumber",
  "feature",
  "status",
  "evidenceCount",
  "evidencePaths",
  "evidenceNote",
];
const csvRows = items.map((it) => [
  it.featureId,
  String(it.featureNumber),
  it.feature,
  it.status,
  String(it.evidence.length),
  it.evidence.join(" | "),
  it.evidenceNote,
]);

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csv =
  [csvHeader, ...csvRows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n") + "\n";

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
fs.writeFileSync(trackerJsonPath, JSON.stringify(tracker, null, 2));
fs.writeFileSync(trackerCsvPath, csv);

console.log(
  `Wrote:\n- ${path.relative(ROOT, outPath)}\n- ${path.relative(ROOT, trackerJsonPath)}\n- ${path.relative(ROOT, trackerCsvPath)}`,
);
