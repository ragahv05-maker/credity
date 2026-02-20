#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.env.LAUNCH_GATE_STRICT === '1';

const checks = [];

const exists = (rel) => fs.existsSync(path.join(root, rel));
const isTrue = (value) => String(value || '').toLowerCase() === 'true';
const isHex64 = (value) => /^[a-fA-F0-9]{64}$/.test(String(value || ''));

function add(name, pass, detail, required = true) {
  checks.push({ name, pass, detail, required });
}

add('runbook: incident-response', exists('docs/runbooks/incident-response.md'), 'docs/runbooks/incident-response.md');
add('runbook: rollback', exists('docs/runbooks/rollback.md'), 'docs/runbooks/rollback.md');
add('gate doc: production launch', exists('docs/gates/production-launch-gate.md'), 'docs/gates/production-launch-gate.md');
add('compliance evidence template', exists('docs/compliance/launch-evidence-template.md'), 'docs/compliance/launch-evidence-template.md');

// Strict launch controls (required for production GO/NO-GO)
add('distributed rate limit/session store configured', !!process.env.REDIS_URL, 'REDIS_URL present', strict);
add(
  'error tracking configured',
  !!(process.env.SENTRY_DSN || process.env.GATEWAY_SENTRY_DSN),
  'SENTRY_DSN or GATEWAY_SENTRY_DSN present',
  strict,
);
add('jwt secrets configured', !!(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET), 'JWT_SECRET + JWT_REFRESH_SECRET present', strict);

add('production mode enabled', process.env.NODE_ENV === 'production', 'NODE_ENV=production', strict);
add('demo routes disabled', process.env.ALLOW_DEMO_ROUTES === 'false', 'ALLOW_DEMO_ROUTES=false', strict);
add('database enforcement enabled', isTrue(process.env.REQUIRE_DATABASE), 'REQUIRE_DATABASE=true', strict);
add('queue enforcement enabled', isTrue(process.env.REQUIRE_QUEUE), 'REQUIRE_QUEUE=true', strict);

add('issuer key encryption configured', !!process.env.ISSUER_KEY_ENCRYPTION, 'ISSUER_KEY_ENCRYPTION present', strict);
add('issuer key encryption format', isHex64(process.env.ISSUER_KEY_ENCRYPTION), 'ISSUER_KEY_ENCRYPTION is 64-char hex', strict);
add('issuer relayer key configured', !!process.env.RELAYER_PRIVATE_KEY, 'RELAYER_PRIVATE_KEY present', strict);
add('issuer registry contract configured', !!process.env.REGISTRY_CONTRACT_ADDRESS, 'REGISTRY_CONTRACT_ADDRESS present', strict);
add(
  'issuer chain RPC configured',
  !!(process.env.SEPOLIA_RPC_URL || process.env.CHAIN_RPC_URL || process.env.RPC_URL),
  'SEPOLIA_RPC_URL or CHAIN_RPC_URL or RPC_URL present',
  strict,
);

let failed = 0;
for (const c of checks) {
  const ok = c.pass || !c.required;
  if (!ok) failed += 1;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${c.name} - ${c.detail}${c.required ? '' : ' (advisory)'}`);
}

if (failed > 0) {
  console.error(`\nLaunch gate failed (${failed} required checks).`);
  process.exit(1);
}

console.log('\nLaunch gate checks passed.');
