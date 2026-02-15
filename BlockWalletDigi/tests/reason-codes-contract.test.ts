import { describe, expect, it } from 'vitest';
import express from 'express';
import http from 'http';
import claimsRoutes from '../server/routes/claims';

async function withServer<T>(handler: (baseUrl: string) => Promise<T>) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1/claims', claimsRoutes);

  const server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind reason codes test server');
  }

  try {
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function isSortedLex(arr: string[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1].localeCompare(arr[i]) > 0) return false;
  }
  return true;
}

describe('verification result contract: reason codes + normalized risk signals', () => {
  it('returns stable, sorted reason_codes and normalized risk_signals objects', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/claims/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-contract-1',
          claim_type: 'identity_check',
          description: 'Onboarding identity check. Please verify.',
          timeline: [],
          evidence: [],
          // Intentionally missing verified_human so we deterministically get an identity reason code.
          user_credentials: [{ type: 'government_id' }],
        }),
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as any;

      expect(body.success).toBe(true);
      expect(Array.isArray(body.reason_codes)).toBe(true);
      expect(body.reason_codes.length).toBeGreaterThan(0);
      expect(new Set(body.reason_codes).size).toBe(body.reason_codes.length);
      expect(isSortedLex(body.reason_codes)).toBe(true);
      expect(body.reason_codes).toContain('IDENTITY_MISSING_VERIFIED_HUMAN');
      expect(body.reason_codes).toContain('EVIDENCE_NONE_PROVIDED');

      expect(body.risk_signals_version).toBe('risk-v1');
      expect(Array.isArray(body.risk_signals)).toBe(true);
      expect(body.risk_signals.length).toBeGreaterThan(0);

      // Contract checks: each signal has the normalized shape and the array is sorted by id.
      const ids = body.risk_signals.map((s: any) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(isSortedLex(ids)).toBe(true);

      for (const signal of body.risk_signals) {
        expect(typeof signal.id).toBe('string');
        expect(typeof signal.score).toBe('number');
        expect(signal.score).toBeGreaterThanOrEqual(0);
        expect(signal.score).toBeLessThanOrEqual(1);
        expect(['info', 'low', 'medium', 'high']).toContain(signal.severity);
        expect(['rules', 'ai', 'provider']).toContain(signal.source);
        expect(Array.isArray(signal.reason_codes)).toBe(true);
      }

      expect(Array.isArray(body.evidence_links)).toBe(true);
    });
  });
});
