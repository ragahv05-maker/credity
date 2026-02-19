import { Router, type Request } from 'express';

type ProxyTarget = 'wallet' | 'issuer' | 'recruiter';

interface TargetConfig {
    envKey: string;
    fallbackUrl: string;
    allowedPrefixes: string[];
    nonApiPrefixes?: string[];
}

const TARGETS: Record<ProxyTarget, TargetConfig> = {
    wallet: {
        envKey: 'WALLET_API_URL',
        fallbackUrl: 'http://localhost:5002',
        allowedPrefixes: [
            'v1/auth',
            'v1/wallet',
            'v1/credentials',
            'v1/did',
            'v1/digilocker',
            'v1/identity',
            'v1/trust-score',
            'v1/reputation',
            'v1/connections',
            'v1/compliance',
            'auth',
            'wallet',
            'credentials',
            'did',
            'digilocker',
            'identity',
            'trust-score',
            'reputation',
            'connections',
            'v1/claims',
            'compliance',
        ],
    },
    issuer: {
        envKey: 'ISSUER_API_URL',
        fallbackUrl: 'http://localhost:5001',
        allowedPrefixes: [
            'v1/oid4vci',
            'v1/compliance',
            'v1/queue',
            'v1/status/bitstring',
            'v1/anchors',
            'v1/auth',
            'v1/credentials',
            'v1/students',
            'v1/templates',
            'v1/verify',
            'v1/analytics',
            'v1/verification-logs',
            'v1/reports',
            'v1/exports',
            'v1/reputation',
        ],
        nonApiPrefixes: [
            '.well-known/openid-credential-issuer',
        ],
    },
    recruiter: {
        envKey: 'RECRUITER_API_URL',
        fallbackUrl: 'http://localhost:5003',
        allowedPrefixes: [
            'auth',
            'verify',
            'verifications',
            'fraud',
            'v1/oid4vp',
            'v1/verifications',
            'v1/compliance',
        ],
    },
};

const FORWARDED_HEADERS = [
    'authorization',
    'content-type',
    'idempotency-key',
    'x-api-key',
    'x-request-id',
];

const CLAIMS_BASE_PATH = 'v1/claims';
const CLAIMS_BODY_MAX_BYTES = 32 * 1024;
const CLAIMS_QUERY_MAX_ITEMS = 20;
const CLAIMS_QUERY_VALUE_MAX_CHARS = 512;
const CLAIMS_ALLOWED_METHODS = new Set(['GET', 'POST']);

function parsePositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        return fallback;
    }
    return parsed;
}

const PROXY_TIMEOUT_MS = parsePositiveInt(process.env.MOBILE_PROXY_TIMEOUT_MS, 10_000, 500, 120_000);
const CLAIMS_RATE_LIMIT_MAX = parsePositiveInt(process.env.MOBILE_PROXY_CLAIMS_RATE_LIMIT_MAX, 60, 1, 1000);
const CLAIMS_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.MOBILE_PROXY_CLAIMS_RATE_LIMIT_WINDOW_MS, 60_000, 1000, 3_600_000);

type RateLimitBucket = { count: number; resetAt: number };
const claimsRateBuckets = new Map<string, RateLimitBucket>();

function normalizeSubpath(rawPath: string): string {
    return rawPath
        .replace(/^\/+/, '')
        .replace(/\/+/g, '/')
        .replace(/\/$/, '');
}

function isSubpathAllowed(target: ProxyTarget, subpath: string): boolean {
    if (subpath.length > 1024) return false;
    if (/[\\\u0000-\u001F]/.test(subpath)) return false;
    const parts = subpath.split('/');
    if (parts.some((part) => part === '..' || part === '.')) return false;

    const prefixes = TARGETS[target].allowedPrefixes;
    const isApiAllowed = prefixes.some((prefix) => subpath === prefix || subpath.startsWith(`${prefix}/`));
    if (isApiAllowed) return true;

    const nonApiPrefixes = TARGETS[target].nonApiPrefixes || [];
    return nonApiPrefixes.some((prefix) => subpath === prefix || subpath.startsWith(`${prefix}/`));
}

function isClaimsRoute(target: ProxyTarget, subpath: string): boolean {
    return target === 'wallet' && (subpath === CLAIMS_BASE_PATH || subpath.startsWith(`${CLAIMS_BASE_PATH}/`));
}

function getClientIdentifier(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }
    if (Array.isArray(forwardedFor) && forwardedFor[0]) {
        return forwardedFor[0].split(',')[0]?.trim() || 'unknown';
    }
    return req.ip || 'unknown';
}

function consumeClaimsRateLimit(req: Request): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const key = getClientIdentifier(req);
    const existing = claimsRateBuckets.get(key);

    if (!existing || existing.resetAt <= now) {
        claimsRateBuckets.set(key, {
            count: 1,
            resetAt: now + CLAIMS_RATE_LIMIT_WINDOW_MS,
        });
        return { allowed: true };
    }

    if (existing.count >= CLAIMS_RATE_LIMIT_MAX) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
    }

    existing.count += 1;
    claimsRateBuckets.set(key, existing);
    return { allowed: true };
}

function isSafeClaimsQueryValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
    return false;
}

function validateClaimsPayload(req: Request): { valid: true } | { valid: false; status: number; error: string } {
    if (!CLAIMS_ALLOWED_METHODS.has(req.method)) {
        return { valid: false, status: 405, error: 'Method not allowed for claims proxy route' };
    }

    const queryItems = Object.entries(req.query || {});
    if (queryItems.length > CLAIMS_QUERY_MAX_ITEMS) {
        return { valid: false, status: 400, error: 'Too many query parameters for claims route' };
    }

    for (const [, value] of queryItems) {
        if (Array.isArray(value)) {
            if (value.length > CLAIMS_QUERY_MAX_ITEMS) {
                return { valid: false, status: 400, error: 'Too many values for claims query parameter' };
            }
            if (value.some((item) => !isSafeClaimsQueryValue(item))) {
                return { valid: false, status: 400, error: 'Claims query parameter type is not allowed' };
            }
            if (value.some((item) => String(item).length > CLAIMS_QUERY_VALUE_MAX_CHARS)) {
                return { valid: false, status: 400, error: 'Claims query parameter value too large' };
            }
            continue;
        }

        if (!isSafeClaimsQueryValue(value)) {
            return { valid: false, status: 400, error: 'Claims query parameter type is not allowed' };
        }

        if (String(value).length > CLAIMS_QUERY_VALUE_MAX_CHARS) {
            return { valid: false, status: 400, error: 'Claims query parameter value too large' };
        }
    }

    if (req.method === 'GET') {
        return { valid: true };
    }

    const rawContentType = req.headers['content-type'];
    const contentType = Array.isArray(rawContentType) ? rawContentType.join(',') : rawContentType || '';
    if (!contentType.toLowerCase().includes('application/json')) {
        return { valid: false, status: 415, error: 'Claims route requires application/json content-type' };
    }

    const payload = req.body;
    if (payload === undefined || payload === null) {
        return { valid: false, status: 400, error: 'Claims request payload is required' };
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
        return { valid: false, status: 400, error: 'Claims request payload must be a JSON object' };
    }

    const serialized = JSON.stringify(payload);
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > CLAIMS_BODY_MAX_BYTES) {
        return { valid: false, status: 413, error: 'Claims request payload too large' };
    }

    if (Object.keys(payload).length > 100) {
        return { valid: false, status: 400, error: 'Claims request has too many top-level fields' };
    }

    return { valid: true };
}

function resolveTargetBaseUrl(target: ProxyTarget): string {
    const cfg = TARGETS[target];
    return (process.env[cfg.envKey] || cfg.fallbackUrl).replace(/\/$/, '');
}

function buildTargetUrl(target: ProxyTarget, subpath: string, query: Record<string, unknown>): string {
    const baseUrl = resolveTargetBaseUrl(target);
    const nonApiPrefixes = TARGETS[target].nonApiPrefixes || [];
    const useApiPrefix = !nonApiPrefixes.some(
        (prefix) => subpath === prefix || subpath.startsWith(`${prefix}/`),
    );
    const url = new URL(useApiPrefix ? `${baseUrl}/api/${subpath}` : `${baseUrl}/${subpath}`);

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
            for (const v of value) {
                url.searchParams.append(key, String(v));
            }
            continue;
        }
        url.searchParams.append(key, String(value));
    }

    return url.toString();
}

function getForwardHeaders(req: Request): Headers {
    const headers = new Headers();

    FORWARDED_HEADERS.forEach((header) => {
        const value = req.headers[header];
        if (!value) return;
        if (Array.isArray(value)) {
            headers.set(header, value.join(','));
            return;
        }
        headers.set(header, value);
    });

    return headers;
}

function getForwardBody(req: Request): BodyInit | undefined {
    if (req.method === 'GET' || req.method === 'HEAD') {
        return undefined;
    }

    if (req.body === undefined || req.body === null) {
        return undefined;
    }

    if (typeof req.body === 'string') {
        return req.body;
    }

    if (Buffer.isBuffer(req.body)) {
        return req.body;
    }

    return JSON.stringify(req.body);
}

function mapProxyError(error: unknown): { statusCode: number; error: string } {
    const err = error as { name?: string; code?: string; cause?: { code?: string } };
    const networkCode = err?.code || err?.cause?.code;

    if (err?.name === 'AbortError' || networkCode === 'UND_ERR_CONNECT_TIMEOUT') {
        return { statusCode: 504, error: 'Upstream timeout' };
    }

    if (err?.name === 'TypeError') {
        return { statusCode: 502, error: 'Invalid upstream response' };
    }

    if (typeof networkCode === 'string' && ['ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ECONNRESET'].includes(networkCode)) {
        return { statusCode: 502, error: 'Upstream unavailable' };
    }

    return { statusCode: 502, error: 'Upstream request failed' };
}

const router = Router();

router.all('/:target/*', async (req, res) => {
    const rawTarget = req.params.target;
    if (!rawTarget || !Object.prototype.hasOwnProperty.call(TARGETS, rawTarget)) {
        return res.status(404).json({ error: 'Unknown mobile proxy target' });
    }

    const target = rawTarget as ProxyTarget;
    const wildcardPath = req.params[0] || '';
    const subpath = normalizeSubpath(wildcardPath);

    if (!subpath) {
        return res.status(400).json({ error: 'Missing upstream path' });
    }

    if (!isSubpathAllowed(target, subpath)) {
        return res.status(403).json({ error: 'Route not allowed by mobile proxy policy' });
    }

    if (isClaimsRoute(target, subpath)) {
        const claimsValidation = validateClaimsPayload(req);
        if (!claimsValidation.valid) {
            return res.status(claimsValidation.status).json({ error: claimsValidation.error });
        }

        const rateLimitResult = consumeClaimsRateLimit(req);
        if (!rateLimitResult.allowed) {
            if (rateLimitResult.retryAfterSeconds) {
                res.setHeader('Retry-After', String(rateLimitResult.retryAfterSeconds));
            }
            return res.status(429).json({ error: 'Too many claims requests, please retry later' });
        }
    }

    const targetUrl = buildTargetUrl(target, subpath, req.query as Record<string, unknown>);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
        const upstreamResponse = await fetch(targetUrl, {
            method: req.method,
            headers: getForwardHeaders(req),
            body: getForwardBody(req),
            signal: controller.signal,
        });

        const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
        const contentType = upstreamResponse.headers.get('content-type');

        if (contentType) {
            res.setHeader('content-type', contentType);
        }
        if (process.env.NODE_ENV !== 'production') {
            res.setHeader('X-Proxy-Target', target);
            res.setHeader('X-Proxy-Latency-Ms', String(Date.now() - startedAt));
        }

        return res.status(upstreamResponse.status).send(responseBuffer);
    } catch (error: unknown) {
        const mapped = mapProxyError(error);
        return res.status(mapped.statusCode).json({
            error: mapped.error,
            target,
            path: subpath,
        });
    } finally {
        clearTimeout(timeout);
    }
});

export default router;
