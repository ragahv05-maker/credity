#!/usr/bin/env node
/**
 * Extracts PRD features (#### Feature X: ...) and writes a tracker skeleton.
 * Output: credverse-gateway/public/progress/prd.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const prdPath = path.join(ROOT, 'information__critical ', 'PRD.md');
const statusPath = path.join(ROOT, 'AEOS_Memory', 'Operational_Memory', 'prd-feature-status.json');
const outDir = path.join(ROOT, 'credverse-gateway', 'public', 'progress');
const outPath = path.join(outDir, 'prd.json');

const prd = fs.readFileSync(prdPath, 'utf8');
const re = /^#### Feature\s+\d+\s*:\s*(.+?)\s*$/gm;
const features = [];
let m;
while ((m = re.exec(prd))) {
  const name = m[1].trim();
  features.push(name);
}

let status = { features: {} };
if (fs.existsSync(statusPath)) {
  status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
}

const scoreMap = { DONE: 1, PARTIAL: 0.5, NOT_STARTED: 0 };
let total = 0;
let achieved = 0;
const items = features.map((name) => {
  total += 1;
  const key = name.replace(/\s*🆕\s*$/, '').trim();
  const st = (status.features && status.features[key]) || 'NOT_STARTED';
  achieved += scoreMap[st] ?? 0;
  return { name, status: st };
});

const pct = total ? Math.round((achieved / total) * 1000) / 10 : 0;

const out = {
  generatedAt: new Date().toISOString(),
  totalFeatures: total,
  achievedScore: achieved,
  prdCompletionPct: pct,
  items,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${path.relative(ROOT, outPath)} (prdCompletionPct=${pct}%).`);
