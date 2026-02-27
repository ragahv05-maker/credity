import { beforeAll, afterAll, afterEach, vi } from 'vitest';

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test_jwt_secret_credity_recruiter_32_chars';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_credity_recruiter_32';
process.env.ISSUER_KEY_ENCRYPTION ??= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Global fetch mock to handle external calls (DID resolution, revocation)
const fetchMock = vi.fn();
global.fetch = fetchMock;

beforeAll(() => {
  // Default successful response for issuer resolution and revocation checks
  fetchMock.mockImplementation(async (url) => {
    const urlStr = String(url);

    // Issuer registry mock
    if (urlStr.includes('/registry/issuers/did/')) {
        // If "unknown", return 404
        if (urlStr.includes('unknown') || urlStr.includes('issuer-without-did')) {
             return { ok: false, status: 404, json: async () => ({}) } as Response;
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({
                did: 'did:key:mocked',
                name: 'Mocked University',
                trustStatus: urlStr.includes('policy-review') ? 'unverified' : 'trusted',
                verified: !urlStr.includes('policy-review')
            })
        } as Response;
    }

    // Revocation status mock
    if (urlStr.includes('/verify/') || urlStr.includes('/status')) {
        // If specific revoked ID, return revoked
        if (urlStr.includes('revoked')) {
             return { ok: true, status: 200, json: async () => ({ revoked: true }) } as Response;
        }
        return { ok: true, status: 200, json: async () => ({ revoked: false }) } as Response;
    }

    // Generic fallback
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  });
});

afterEach(() => {
  // Clear mock calls but keep implementation for next test
  fetchMock.mockClear();
});
