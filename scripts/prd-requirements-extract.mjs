#!/usr/bin/env node
/**
 * PRD Requirement-Level Tracker (heuristic)
 *
 * Goal: Convert the PRD's Feature Requirements section into a measurable checklist.
 *
 * Extraction strategy (robust enough for v1):
 * - Identify each "#### Feature X: <name>" block.
 * - Within each feature block, extract bullet items under "Functional Requirements" as requirements.
 * - Each requirement becomes a tracker item (status defaults to NOT_STARTED).
 *
 * Outputs:
 * - AEOS_Memory/Operational_Memory/prd-requirements-status.json (statuses)
 * - credverse-gateway/public/progress/prd-requirements.json (computed %)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const prdPath = path.join(ROOT, 'information__critical ', 'PRD.md');
const statusPath = path.join(ROOT, 'AEOS_Memory', 'Operational_Memory', 'prd-requirements-status.json');
const outDir = path.join(ROOT, 'credverse-gateway', 'public', 'progress');
const outPath = path.join(outDir, 'prd-requirements.json');

const prd = fs.readFileSync(prdPath, 'utf8');

const featureRe = /^#### Feature\s+(\d+)\s*:\s*(.+?)\s*$/gm;

function slug(s) {
  return s
    .toLowerCase()
    .replace(/🆕/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

const features = [];
let m;
const featureHits = [];
while ((m = featureRe.exec(prd))) {
  featureHits.push({ idx: m.index, num: m[1], name: m[2].trim() });
}
for (let i = 0; i < featureHits.length; i++) {
  const start = featureHits[i].idx;
  const end = i + 1 < featureHits.length ? featureHits[i + 1].idx : prd.length;
  const block = prd.slice(start, end);
  features.push({ ...featureHits[i], block });
}

function extractRequirements(block) {
  // Narrow to Functional Requirements section when possible.
  const frIdx = block.search(/^\*\*Functional Requirements:\*\*\s*$/m);
  const acIdx = block.search(/^\*\*Acceptance Criteria:\*\*\s*$/m);
  const sliceStart = frIdx >= 0 ? frIdx : 0;
  const sliceEnd = acIdx >= 0 ? acIdx : block.length;
  const section = block.slice(sliceStart, sliceEnd);

  const reqs = [];
  for (const line of section.split(/\r?\n/)) {
    const t = line.trim();
    // bullets like "- something" or numbered list "1. thing"
    if (t.startsWith('- ')) reqs.push(t.slice(2).trim());
    else if (/^\d+\.\s+/.test(t)) reqs.push(t.replace(/^\d+\.\s+/, '').trim());
  }

  // Deduplicate and drop too-short noise.
  const seen = new Set();
  const out = [];
  for (const r of reqs) {
    const key = r.toLowerCase();
    if (key.length < 4) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

const extracted = [];
for (const f of features) {
  const reqs = extractRequirements(f.block);
  for (let i = 0; i < reqs.length; i++) {
    const rid = `F${f.num}-${String(i + 1).padStart(3, '0')}`;
    extracted.push({
      id: rid,
      feature: f.name,
      text: reqs[i],
      key: `${slug(f.name)}::${slug(reqs[i])}`,
    });
  }
}

// Load or initialize status store
let status = { generatedAt: new Date().toISOString(), scale: { DONE: 1, PARTIAL: 0.5, NOT_STARTED: 0 }, items: {} };
if (fs.existsSync(statusPath)) {
  status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
}

for (const it of extracted) {
  if (!status.items[it.key]) status.items[it.key] = 'NOT_STARTED';
}

// Compute completion
const scoreMap = status.scale || { DONE: 1, PARTIAL: 0.5, NOT_STARTED: 0 };
let total = 0;
let achieved = 0;
for (const it of extracted) {
  total += 1;
  const st = status.items[it.key] || 'NOT_STARTED';
  achieved += scoreMap[st] ?? 0;
}
const pct = total ? Math.round((achieved / total) * 1000) / 10 : 0;

const out = {
  generatedAt: new Date().toISOString(),
  method: 'requirement-level (heuristic extraction from PRD Feature Requirements)',
  totalRequirements: total,
  achievedScore: achieved,
  prdRequirementsCompletionPct: pct,
  items: extracted.map((it) => ({
    id: it.id,
    feature: it.feature,
    requirement: it.text,
    status: status.items[it.key] || 'NOT_STARTED',
  })),
};

fs.mkdirSync(path.dirname(statusPath), { recursive: true });
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`Extracted ${total} requirements. Completion=${pct}%. Wrote:\n- ${path.relative(ROOT, statusPath)}\n- ${path.relative(ROOT, outPath)}`);
