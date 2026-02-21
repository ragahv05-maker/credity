#!/usr/bin/env node
/**
 * Generates a lightweight progress snapshot JSON for the Credity visual dashboard.
 * Source of truth: swarm/reports/credity-s34-master-board.csv
 * Output: credverse-gateway/public/progress/latest.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const csvPath = path.join(
  ROOT,
  "swarm",
  "reports",
  "credity-s34-master-board.csv",
);
const outDir = path.join(ROOT, "credverse-gateway", "public", "progress");
const outPath = path.join(outDir, "latest.json");

function parseCsv(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headerLine = lines.shift();
  const header = headerLine.split(",");
  const rows = [];
  for (const line of lines) {
    const cols = parseFixedBoardLine(line, header.length);
    const row = {};
    for (let i = 0; i < header.length; i++)
      row[header[i]] = (cols[i] ?? "").trim();
    rows.push(row);
  }
  return rows;
}

function parseFixedBoardLine(line, expectedCols) {
  // The S34 board CSV is not strictly RFC4180-quoted.
  // We recover by assuming ONLY the DefinitionOfDone column may contain commas.
  // Column schema (17):
  // ID,Lane,Title,Workstream,DRI,Deputy,Priority,RAG,ImpactHypothesis,DueIST,Dependencies,
  // DefinitionOfDone,ControlGateNeeded,ControlGate,RollbackPlan,Status,LastUpdatedIST
  const parts = line.split(",");
  if (parts.length === expectedCols) return parts;

  // Recompose from the RIGHT:
  // last 5 columns are stable: ControlGateNeeded, ControlGate, RollbackPlan, Status, LastUpdatedIST
  // (even if earlier columns contain commas).
  const HEAD = 11;
  const TAIL = 5;
  if (parts.length < HEAD + TAIL) return parts;

  const head = parts.slice(0, HEAD);
  const tail = parts.slice(parts.length - TAIL);
  const definitionOfDone = parts.slice(HEAD, parts.length - TAIL).join(",");

  return [...head, definitionOfDone, ...tail];
}

function summarize(rows) {
  const totals = {
    byLane: {},
    byPriority: {},
    byRag: {},
    byStatus: {},
  };

  const norm = (s) => (s || "").trim();

  for (const r of rows) {
    const lane = norm(r.Lane);
    const pri = norm(r.Priority);
    const rag = norm(r.RAG);
    const status = norm(r.Status);

    totals.byLane[lane] = (totals.byLane[lane] || 0) + 1;
    totals.byPriority[pri] = (totals.byPriority[pri] || 0) + 1;
    totals.byRag[rag] = (totals.byRag[rag] || 0) + 1;
    totals.byStatus[status] = (totals.byStatus[status] || 0) + 1;
  }

  const done = (totals.byStatus["Done"] || 0) + (totals.byStatus["DONE"] || 0);
  const all = rows.length;
  const completion = all > 0 ? Math.round((done / all) * 1000) / 10 : 0;

  return { totals, completionPct: completion };
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`Missing board CSV: ${csvPath}`);
    process.exit(1);
  }
  const csv = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csv);
  const summary = summarize(rows);

  let prd = null;
  try {
    const prdPath = path.join(
      ROOT,
      "credverse-gateway",
      "public",
      "progress",
      "prd.json",
    );
    if (fs.existsSync(prdPath))
      prd = JSON.parse(fs.readFileSync(prdPath, "utf8"));
  } catch {
    prd = null;
  }

  let prdReq = null;
  try {
    const prdReqPath = path.join(
      ROOT,
      "credverse-gateway",
      "public",
      "progress",
      "prd-requirements.json",
    );
    if (fs.existsSync(prdReqPath))
      prdReq = JSON.parse(fs.readFileSync(prdReqPath, "utf8"));
  } catch {
    prdReq = null;
  }

  let prdTracker = null;
  try {
    const prdTrackerPath = path.join(
      ROOT,
      "credverse-gateway",
      "public",
      "progress",
      "prd-feature-tracker.json",
    );
    if (fs.existsSync(prdTrackerPath))
      prdTracker = JSON.parse(fs.readFileSync(prdTrackerPath, "utf8"));
  } catch {
    prdTracker = null;
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: {
      boardCsv: "swarm/reports/credity-s34-master-board.csv",
      prdJson: prd ? "credverse-gateway/public/progress/prd.json" : null,
      prdRequirementsJson: prdReq
        ? "credverse-gateway/public/progress/prd-requirements.json"
        : null,
      prdFeatureTrackerJson: prdTracker
        ? "credverse-gateway/public/progress/prd-feature-tracker.json"
        : null,
      prdFeatureTrackerCsv: prdTracker
        ? "credverse-gateway/public/progress/prd-feature-tracker.csv"
        : null,
    },
    summary: {
      ...summary,
      prdCompletionPct: prd?.prdCompletionPct ?? null,
      prdRequirementsCompletionPct:
        prdReq?.prdRequirementsCompletionPct ?? null,
      prdRequirementsTotal: prdReq?.totalRequirements ?? null,
      prdEvidenceMappedFeatures: prdTracker?.mappedEvidenceFeatures ?? null,
      prdFeaturesTotal: prdTracker?.totalFeatures ?? null,
    },
    items: rows.map((r) => ({
      id: r.ID,
      lane: r.Lane,
      title: r.Title,
      workstream: r.Workstream,
      dri: r.DRI,
      deputy: r.Deputy,
      priority: r.Priority,
      rag: r.RAG,
      dueIST: r.DueIST,
      dependencies: r.Dependencies,
      status: r.Status,
      lastUpdatedIST: r.LastUpdatedIST,
    })),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${rows.length} items).`);
}

main();
