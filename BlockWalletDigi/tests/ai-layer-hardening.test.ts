import { describe, expect, it } from 'vitest';
import express from 'express';
import http from 'http';
import claimsRoutes from '../server/routes/claims';
import { aiService } from '../server/services/ai-service';
import { detectDeepfakeFromUrl } from '../server/services/deepfake-detection-service';

async function withServer(handler: (baseUrl: string) => Promise<void>) {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/v1/claims', claimsRoutes);

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to bind ai hardening test server');
    }

    try {
        await handler(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
}

describe('AI layer hardening', () => {
    it('rejects invalid evidence payload with structured validation error', async () => {
        await withServer(async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/v1/claims/evidence/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: 'u1', url: 'not-a-url' }),
            });

            expect(response.status).toBe(400);
            const body = (await response.json()) as { error: string; details?: unknown };
            expect(body.error).toBe('validation_error');
            expect(body.details).toBeTruthy();
        });
    });

    it('falls back safely when liveness input is invalid', async () => {
        const result = await aiService.analyzeLivenessFrame('tiny');
        expect(result.isReal).toBe(false);
        expect(result.spoofingDetected).toBe(true);
        expect(result.details).toContain('ai_liveness_failed');
    });

    it('returns deterministic provider-neutral response for invalid deepfake URL', async () => {
        const result = await detectDeepfakeFromUrl('notaurl');
        expect(result.verdict).toBe('unknown');
        expect(result.provider).toBe('validation');
        expect(result.reason).toBe('invalid_url');
    });

    it('processes claim verify happy path through integration endpoint', async () => {
        await withServer(async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/v1/claims/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 'user-1',
                    claim_type: 'identity_check',
                    description: 'Identity proof submitted for onboarding.',
                    timeline: [{ timestamp: new Date().toISOString(), event: 'submission' }],
                    evidence: [],
                    user_credentials: [{ type: 'government_id' }],
                }),
            });

            expect(response.status).toBe(200);
            const body = (await response.json()) as {
                success: boolean;
                claim_id?: string;
                ai_analysis?: unknown;
                reason_codes?: string[];
                risk_signals?: unknown;
            };
            expect(body.success).toBe(true);
            expect(body.claim_id).toBeTruthy();
            expect(body.ai_analysis).toBeTruthy();
            expect(Array.isArray(body.reason_codes)).toBe(true);
            expect(body.reason_codes).toContain('IDENTITY_MISSING_VERIFIED_HUMAN');
            expect(body.reason_codes).toContain('EVIDENCE_NONE_PROVIDED');
        });
    });
});
