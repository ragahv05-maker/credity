import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { verifyAccessToken, comparePassword } from "@credverse/shared-auth";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express } from "express";

// Simple in-memory rate limiter for MVP
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 1000; // 1000 requests per minute
const RATE_LIMIT_TRACKED_KEYS_MAX = 10_000;

function pruneRateLimitMap(now: number): void {
    if (rateLimitMap.size < RATE_LIMIT_TRACKED_KEYS_MAX) {
        return;
    }

    for (const [key, value] of rateLimitMap.entries()) {
        if (now - value.lastReset > RATE_LIMIT_WINDOW) {
            rateLimitMap.delete(key);
        }
    }

    if (rateLimitMap.size < RATE_LIMIT_TRACKED_KEYS_MAX) {
        return;
    }

    const overflow = rateLimitMap.size - RATE_LIMIT_TRACKED_KEYS_MAX + 1;
    let removed = 0;
    for (const key of rateLimitMap.keys()) {
        rateLimitMap.delete(key);
        removed += 1;
        if (removed >= overflow) {
            break;
        }
    }
}

async function resolveApiKeyTenant(keyHeader: string): Promise<{ tenantId: string; keyHash: string; error?: string }> {
    const keyHash = keyHeader;

    // Static operator key via env var — for smoke tests and automated issuance
    const operatorKey = process.env.OPERATOR_API_KEY;
    if (operatorKey && keyHeader === operatorKey) {
        return { tenantId: "operator", keyHash };
    }

    const apiKey = await storage.getApiKey(keyHash);
    if (!apiKey) {
        return { tenantId: "", keyHash, error: "Invalid API Key" };
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        return { tenantId: "", keyHash, error: "API Key expired" };
    }

    return { tenantId: apiKey.tenantId, keyHash };
}

function enforceApiRateLimit(keyHash: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    pruneRateLimitMap(now);
    const limitData = rateLimitMap.get(keyHash) || { count: 0, lastReset: now };

    if (now - limitData.lastReset > RATE_LIMIT_WINDOW) {
        limitData.count = 0;
        limitData.lastReset = now;
    }

    limitData.count++;
    rateLimitMap.set(keyHash, limitData);

    if (limitData.count > RATE_LIMIT_MAX) {
        return { allowed: false, error: "Rate limit exceeded" };
    }

    return { allowed: true };
}

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
    const apiKeyHeader = req.headers["x-api-key"];

    if (!apiKeyHeader || typeof apiKeyHeader !== "string") {
        return res.status(401).json({ message: "Missing or invalid API Key", code: "AUTH_UNAUTHORIZED" });
    }

    const resolved = await resolveApiKeyTenant(apiKeyHeader);
    if (resolved.error) {
        return res.status(401).json({ message: resolved.error, code: "AUTH_UNAUTHORIZED" });
    }

    const rate = enforceApiRateLimit(resolved.keyHash);
    if (!rate.allowed) {
        return res.status(429).json({ message: rate.error, code: "AUTH_RATE_LIMITED" });
    }

    (req as any).tenantId = resolved.tenantId;
    next();
}

/**
 * Allow either API key auth or JWT auth for mobile/app flows.
 * Tenant context is always derived from trusted auth material (API key/JWT), never body/query.
 */
export async function apiKeyOrAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const apiKeyHeader = req.headers["x-api-key"];
    if (apiKeyHeader && typeof apiKeyHeader === "string") {
        const resolved = await resolveApiKeyTenant(apiKeyHeader);
        if (resolved.error) {
            return res.status(401).json({ message: resolved.error, code: "AUTH_UNAUTHORIZED" });
        }

        const rate = enforceApiRateLimit(resolved.keyHash);
        if (!rate.allowed) {
            return res.status(429).json({ message: rate.error, code: "AUTH_RATE_LIMITED" });
        }

        (req as any).tenantId = resolved.tenantId;
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid API Key", code: "AUTH_UNAUTHORIZED" });
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    if (!payload) {
        return res.status(401).json({ message: "Invalid or expired token", code: "AUTH_UNAUTHORIZED" });
    }

    (req as any).user = payload;
    const tokenTenantId = typeof (payload as any).tenantId === "string" && (payload as any).tenantId.trim().length > 0
        ? String((payload as any).tenantId).trim()
        : undefined;

    // SECURITY: never derive tenant context from client-controlled body/query fields.
    (req as any).tenantId = tokenTenantId || String(payload.userId);
    next();
}

export function setupPassport(app: Express) {
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Incorrect password." });
      }
      // Ensure user object matches Express.User interface (requires userId)
      return done(null, { ...user, userId: user.id, role: user.role || 'user' });
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        // Adapt user object to match TokenPayload structure used elsewhere
        // TokenPayload has userId, existing code uses req.user.userId
        const adaptedUser = { ...user, userId: user.id, role: user.role || 'user' };
        // Remove password hash from session user
        delete (adaptedUser as any).password;
        done(null, adaptedUser);
      } else {
        done(null, false);
      }
    } catch (err) {
      done(err);
    }
  });
}

/**
 * Middleware to enforce authentication.
 * Supports multiple authentication mechanisms:
 * 1. Passport Session (req.isAuthenticated())
 * 2. API Key (req.tenantId set by middleware)
 * 3. JWT Token (req.user set by middleware)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    // Check for active Passport session
    if (req.isAuthenticated()) {
        return next();
    }

    // Check if API Key or Token middleware has already authenticated the request
    if ((req as any).tenantId || (req as any).user) {
        return next();
    }

    res.status(401).json({ message: "Unauthorized", code: "AUTH_UNAUTHORIZED" });
}
