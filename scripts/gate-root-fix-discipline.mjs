#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

function sh(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

const status = sh('git status --porcelain');
if (!status) {
  console.log('✅ Root-fix gate: no pending changes.');
  process.exit(0);
}

const changedFiles = status
  .split('\n')
  .map((line) => line.slice(3).trim())
  .filter(Boolean);

const codeFilePattern = /^(BlockWalletDigi|CredVerseRecruiter|CredVerseIssuer 3|packages\/trust-sdk)\/(server|src|client|shared)\//;
const testFilePattern = /^(BlockWalletDigi|CredVerseRecruiter|CredVerseIssuer 3|packages\/trust-sdk)\/tests\/.*\.(test|spec)\./;

const changedCodeFiles = changedFiles.filter((file) => codeFilePattern.test(file));
const changedTestFiles = changedFiles.filter((file) => testFilePattern.test(file));

if (changedCodeFiles.length > 0 && changedTestFiles.length === 0) {
  console.error('❌ Root-fix gate failed: code changed but no test files updated.');
  console.error('   Add or update at least one relevant test before claiming completion.');
  process.exit(1);
}

const forbiddenNameMarkers = [' copy', '(copy)', 'backup', '.bak'];
for (const file of changedFiles) {
  const lower = file.toLowerCase();
  if (forbiddenNameMarkers.some((marker) => lower.includes(marker))) {
    console.error(`❌ Root-fix gate failed: suspicious redundant file name detected -> ${file}`);
    process.exit(1);
  }
}

const forbiddenContentMarkers = [
  'TODO: temporary',
  'TEMP HACK',
  'temporary workaround',
  'fake success',
];

for (const file of changedCodeFiles) {
  if (!existsSync(file)) continue;
  let content = '';
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const marker of forbiddenContentMarkers) {
    if (content.toLowerCase().includes(marker.toLowerCase())) {
      console.error(`❌ Root-fix gate failed: found forbidden marker "${marker}" in ${file}`);
      process.exit(1);
    }
  }
}

console.log('✅ Root-fix gate passed.');
console.log(`   Changed code files: ${changedCodeFiles.length}`);
console.log(`   Changed test files: ${changedTestFiles.length}`);
