import crypto from "crypto";
import type { RequestHandler } from "express";

type StoredResponse = {
  statusCode: number;
  body: unknown;
  createdAt: number;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 5000;
const cache = new Map<string, StoredResponse>();

function pruneExpired(ttlMs: number): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.createdAt > ttlMs) {
      cache.delete(key);
    }
  }
}

function pruneOverflow(maxEntries: number): void {
  if (cache.size <= maxEntries) return;
  const removeCount = cache.size - maxEntries;
  const keys = cache.keys();
  for (let i = 0; i < removeCount; i++) {
    const next = keys.next();
    if (next.done) break;
    cache.delete(next.value);
  }
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(stableStringify(value))
    .digest("hex");
}

function requestFingerprint(req: {
  method: string;
  originalUrl: string;
  body?: unknown;
  query?: unknown;
}): string {
  return stableHash({
    method: req.method,
    path: req.originalUrl,
    body: req.body ?? null,
    query: req.query ?? null,
  });
}

export function idempotencyMiddleware(options?: {
  ttlMs?: number;
  maxEntries?: number;
}): RequestHandler {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;

  return (req, res, next): void => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      next();
      return;
    }

    pruneExpired(ttlMs);
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      next();
      return;
    }

    const key = `${idempotencyKey}:${requestFingerprint(req)}`;
    const cached = cache.get(key);
    if (cached) {
      res.status(cached.statusCode).json(cached.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300) {
        cache.set(key, {
          statusCode,
          body,
          createdAt: Date.now(),
        });
        pruneOverflow(maxEntries);
      }
      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}
