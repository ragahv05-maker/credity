import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mobileProxyRoutes from './mobile-proxy';

const originalFetch = globalThis.fetch;

type MockFetchCall = {
    input: string;
    init?: RequestInit;
};

async function withProxyServer<T>(
    handler: (ctx: {
        baseUrl: string;
        localFetch: typeof fetch;
        calls: MockFetchCall[];
    }) => Promise<T>,
    options?: {
        mockFetch?: (input: RequestInfo | URL, init?: RequestInit, calls?: MockFetchCall[]) => Promise<Response>;
    },
): Promise<T> {
    const calls: MockFetchCall[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input: String(input), init });

        if (options?.mockFetch) {
            return options.mockFetch(input, init, calls);
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    }) as typeof fetch;

    const app = express();
    app.use(express.json());
    app.use('/api/mobile', mobileProxyRoutes);

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to bind proxy test server');
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const localFetch = originalFetch;

    try {
        return await handler({ baseUrl, localFetch, calls });
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
        globalThis.fetch = originalFetch;
    }
}

test('mobile proxy blocks unknown targets and disallowed routes', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const unknownTarget = await localFetch(`${baseUrl}/api/mobile/unknown/auth/me`);
        assert.equal(unknownTarget.status, 404);

        const blockedPath = await localFetch(`${baseUrl}/api/mobile/wallet/not-allowed/path`);
        assert.equal(blockedPath.status, 403);

        const traversalPath = await localFetch(`${baseUrl}/api/mobile/wallet/%2e%2e/auth/login`);
        assert.ok([403, 404].includes(traversalPath.status));

        assert.equal(calls.length, 0);
    });
});

test('mobile proxy forwards issuer well-known metadata without /api prefix', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const response = await localFetch(`${baseUrl}/api/mobile/issuer/.well-known/openid-credential-issuer`);
        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.input, 'http://localhost:5001/.well-known/openid-credential-issuer');
    });
});

test('mobile proxy forwards issuer OID routes with /api prefix and propagates idempotency key', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const response = await localFetch(`${baseUrl}/api/mobile/issuer/v1/oid4vci/credential`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': 'test-idempotency-key',
            },
            body: JSON.stringify({ sample: true }),
        });

        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.input, 'http://localhost:5001/api/v1/oid4vci/credential');

        const upstreamHeaders = calls[0]?.init?.headers as Headers | undefined;
        assert.ok(upstreamHeaders);
        assert.equal(upstreamHeaders?.get('idempotency-key'), 'test-idempotency-key');
    });
});

test('mobile proxy forwards wallet reputation v1 routes with /api prefix', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const response = await localFetch(`${baseUrl}/api/mobile/wallet/v1/reputation/score?userId=1`);
        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.input, 'http://localhost:5002/api/v1/reputation/score?userId=1');
    });
});

test('mobile proxy forwards wallet compliance routes with /api prefix', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const response = await localFetch(`${baseUrl}/api/mobile/wallet/v1/compliance/consents?userId=7`);
        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.input, 'http://localhost:5002/api/v1/compliance/consents?userId=7');
    });
});

test('mobile proxy forwards issuer queue and compliance routes with /api prefix', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const queueResponse = await localFetch(`${baseUrl}/api/mobile/issuer/v1/queue/dead-letter?limit=5`);
        assert.equal(queueResponse.status, 200);
        assert.equal(calls[0]?.input, 'http://localhost:5001/api/v1/queue/dead-letter?limit=5');

        const complianceResponse = await localFetch(`${baseUrl}/api/mobile/issuer/v1/compliance/consents`);
        assert.equal(complianceResponse.status, 200);
        assert.equal(calls[1]?.input, 'http://localhost:5001/api/v1/compliance/consents');
    });
});

test('mobile proxy forwards recruiter compliance routes with /api prefix', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const response = await localFetch(`${baseUrl}/api/mobile/recruiter/v1/compliance/audit-log/export`);
        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.input, 'http://localhost:5003/api/v1/compliance/audit-log/export');
    });
});

test('mobile proxy blocks malformed claims payloads before forwarding', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const arrayPayload = await localFetch(`${baseUrl}/api/mobile/wallet/v1/claims/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(['not-an-object']),
        });

        assert.equal(arrayPayload.status, 400);
        assert.equal(calls.length, 0);
    });
});

test('mobile proxy forwards wallet claims happy-path requests', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const payload = {
            claim_type: 'identity_check',
            description: 'Customer submitted identity verification claim',
        };

        const response = await localFetch(`${baseUrl}/api/mobile/wallet/v1/claims/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer test-token',
            },
            body: JSON.stringify(payload),
        });

        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.input, 'http://localhost:5002/api/v1/claims/verify');

        const upstreamHeaders = calls[0]?.init?.headers as Headers | undefined;
        assert.equal(upstreamHeaders?.get('authorization'), 'Bearer test-token');
        assert.equal(calls[0]?.init?.body, JSON.stringify(payload));
    });
});

test('mobile proxy enforces claims method and content-type guardrails', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const methodRejected = await localFetch(`${baseUrl}/api/mobile/wallet/v1/claims/verify`, {
            method: 'DELETE',
        });
        assert.equal(methodRejected.status, 405);

        const contentTypeRejected = await localFetch(`${baseUrl}/api/mobile/wallet/v1/claims/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ test: true }),
        });
        assert.equal(contentTypeRejected.status, 415);
        assert.equal(calls.length, 0);
    });
});

test('mobile proxy enforces claims query size limits', async () => {
    await withProxyServer(async ({ baseUrl, localFetch, calls }) => {
        const tooManyParams = new URLSearchParams();
        for (let i = 0; i < 21; i += 1) {
            tooManyParams.append(`k${i}`, 'v');
        }

        const tooManyParamsResponse = await localFetch(
            `${baseUrl}/api/mobile/wallet/v1/claims/list?${tooManyParams.toString()}`,
        );
        assert.equal(tooManyParamsResponse.status, 400);

        const longValue = 'a'.repeat(513);
        const longValueResponse = await localFetch(
            `${baseUrl}/api/mobile/wallet/v1/claims/list?search=${longValue}`,
        );
        assert.equal(longValueResponse.status, 400);
        assert.equal(calls.length, 0);
    });
});

test('mobile proxy rate limits claims requests per client', async () => {
    await withProxyServer(async ({ baseUrl, localFetch }) => {
        const headers = {
            'x-forwarded-for': '198.51.100.55',
            'content-type': 'application/json',
        };

        for (let i = 0; i < 60; i += 1) {
            const response = await localFetch(`${baseUrl}/api/mobile/wallet/v1/claims/verify`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ sequence: i }),
            });
            assert.equal(response.status, 200);
        }

        const blocked = await localFetch(`${baseUrl}/api/mobile/wallet/v1/claims/verify`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ sequence: 'blocked' }),
        });

        assert.equal(blocked.status, 429);
        assert.ok(blocked.headers.get('Retry-After'));
    });
});

test('mobile proxy maps upstream network and timeout errors', async () => {
    await withProxyServer(
        async ({ baseUrl, localFetch }) => {
            const unavailable = await localFetch(`${baseUrl}/api/mobile/wallet/v1/wallet/balance`);
            assert.equal(unavailable.status, 502);
            const unavailableBody = await unavailable.json();
            assert.equal(unavailableBody.error, 'Upstream unavailable');

            const timeout = await localFetch(`${baseUrl}/api/mobile/wallet/v1/wallet/timeout`);
            assert.equal(timeout.status, 504);
            const timeoutBody = await timeout.json();
            assert.equal(timeoutBody.error, 'Upstream timeout');

            const invalid = await localFetch(`${baseUrl}/api/mobile/wallet/v1/wallet/invalid`);
            assert.equal(invalid.status, 502);
            const invalidBody = await invalid.json();
            assert.equal(invalidBody.error, 'Invalid upstream response');
        },
        {
            mockFetch: async (input) => {
                const url = String(input);
                if (url.endsWith('/api/v1/wallet/balance')) {
                    const err = new Error('connection refused') as Error & { code?: string };
                    err.code = 'ECONNREFUSED';
                    throw err;
                }
                if (url.endsWith('/api/v1/wallet/timeout')) {
                    const err = new Error('timeout') as Error & { code?: string };
                    err.name = 'AbortError';
                    throw err;
                }
                if (url.endsWith('/api/v1/wallet/invalid')) {
                    const err = new TypeError('bad response');
                    throw err;
                }
                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            },
        },
    );
});
