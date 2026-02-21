const fs = require("fs");
const path = require("path");

const rootDir = "/Users/raghav/Desktop/credity";
const operationalMemDir = path.join(rootDir, "AEOS_Memory/Operational_Memory");
const progressDir = path.join(rootDir, "credverse-gateway/public/progress");

const prdStatusPath = path.join(operationalMemDir, "prd-feature-status.json");
const reqStatusPath = path.join(
  operationalMemDir,
  "prd-requirements-status.json",
);
const latestJsonPath = path.join(progressDir, "latest.json");

// Read JSONs
const prdStatus = JSON.parse(fs.readFileSync(prdStatusPath, "utf8"));
const reqStatus = JSON.parse(fs.readFileSync(reqStatusPath, "utf8"));
let latestJson = {};
try {
  latestJson = JSON.parse(fs.readFileSync(latestJsonPath, "utf8"));
} catch (e) {
  console.log("latest.json not found or invalid, creating new.");
}

// Calculate PRD Feature Completion
const features = prdStatus.features;
const featureKeys = Object.keys(features);
const featureTotal = featureKeys.length;
let featureScore = 0;
const scale = prdStatus.scale || { DONE: 1, PARTIAL: 0.5, NOT_STARTED: 0 };

featureKeys.forEach((key) => {
  const status = features[key];
  featureScore += scale[status] || 0;
});

const prdCompletionPct =
  featureTotal > 0 ? (featureScore / featureTotal) * 100 : 0;

// Calculate Requirements Completion
const items = reqStatus.items;
const itemKeys = Object.keys(items);
const itemTotal = itemKeys.length;
let itemScore = 0;
const reqScale = reqStatus.scale || { DONE: 1, PARTIAL: 0.5, NOT_STARTED: 0 };

itemKeys.forEach((key) => {
  const status = items[key];
  itemScore += reqScale[status] || 0;
});

const prdRequirementsCompletionPct =
  itemTotal > 0 ? (itemScore / itemTotal) * 100 : 0;

// Update latest.json summary
if (!latestJson.summary) latestJson.summary = {};
latestJson.summary.prdCompletionPct = parseFloat(prdCompletionPct.toFixed(1));
latestJson.summary.prdRequirementsCompletionPct = parseFloat(
  prdRequirementsCompletionPct.toFixed(1),
);
latestJson.summary.prdRequirementsTotal = itemTotal;
latestJson.generatedAt = new Date().toISOString();

// Write back
fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2));

// Generate CSVs
const prdCsvPath = path.join(operationalMemDir, "prd-feature-status.csv");
const reqCsvPath = path.join(operationalMemDir, "prd-requirements-status.csv");

const prdCsvContent = ["Feature,Status"]
  .concat(Object.entries(prdStatus.features).map(([k, v]) => `"${k}",${v}`))
  .join("\n");

const reqCsvContent = ["Requirement,Status"]
  .concat(Object.entries(reqStatus.items).map(([k, v]) => `"${k}",${v}`))
  .join("\n");

fs.writeFileSync(prdCsvPath, prdCsvContent);
fs.writeFileSync(reqCsvPath, reqCsvContent);

console.log(
  `Updated latest.json: PRD ${prdCompletionPct.toFixed(1)}%, Reqs ${prdRequirementsCompletionPct.toFixed(1)}%`,
);
console.log("CSVs updated in AEOS_Memory/Operational_Memory");
