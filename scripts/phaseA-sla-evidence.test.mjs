import test from 'node:test';
import assert from 'node:assert/strict';
import { runHarness } from './phaseA-sla-evidence.mjs';

test('Phase A SLA harness: p95 under 1s for local compute/update metrics', async () => {
  const report = await runHarness();
  const target = report.targetMs;

  assert.ok(report.metrics.trustComputeMs.p95Ms < target, 'trust p95 should be < 1s');
  assert.ok(report.metrics.reputationComputeMs.p95Ms < target, 'reputation p95 should be < 1s');
  assert.ok(report.metrics.workscoreComputeMs.p95Ms < target, 'workscore p95 should be < 1s');
  assert.ok(report.metrics.reputationSyncUpdateMs.p95Ms < target, 'sync update p95 should be < 1s');
});
