#!/usr/bin/env node
import { execSync } from 'node:child_process';

const action = process.argv[2];
const rawService = [
  process.env.RAILWAY_SERVICE_NAME,
  process.env.RAILWAY_SERVICE,
  process.env.SERVICE_NAME,
  process.env.APP_SERVICE,
  process.env.CREDITY_SERVICE,
  process.env.RAILWAY_DOCKERFILE_PATH,
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

function run(cmd) {
  console.log(`\n[railway-dispatch] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: process.env });
}

function targetForService(name) {
  if (name.includes('issuer')) return 'CredVerseIssuer 3';
  if (name.includes('wallet')) return 'BlockWalletDigi';
  if (name.includes('recruiter')) return 'CredVerseRecruiter';
  return null;
}

const target = targetForService(rawService);

if (!target) {
  console.error(
    `[railway-dispatch] Unsupported or missing service identity. ` +
      `Set one of: RAILWAY_SERVICE_NAME, RAILWAY_SERVICE, SERVICE_NAME, APP_SERVICE, CREDITY_SERVICE.`
  );
  process.exit(1);
}

if (action === 'build') {
  run('npm --prefix packages/shared-auth ci');
  run('npm --prefix packages/shared-auth run build');
  run('npm --prefix packages/trust-sdk ci');
  run('npm --prefix packages/trust-sdk run build');
  run(`npm --prefix "${target}" ci --legacy-peer-deps`);
  run(`npm --prefix "${target}" run build`);
  process.exit(0);
}

if (action === 'start') {
  run(`npm --prefix "${target}" run start`);
  process.exit(0);
}

console.error(`[railway-dispatch] Unknown action: ${action}`);
process.exit(1);
