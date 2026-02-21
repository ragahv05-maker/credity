import { Router, type Request } from "express";
import crypto from "crypto";
import IORedis from "ioredis";
import {
  initAuth,
  generateAccessToken,
  verifyAccessToken,
  type AuthUser,
} from "@credverse/shared-auth";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  isGoogleOAuthConfigured,
  type GoogleUser,
} from "../services/google";

const router = Router();
const requireStrictSecrets =
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_DATABASE === "true";
const gatewayJwtSecret =
  process.env.JWT_SECRET ||
  (requireStrictSecrets ? "" : "dev-only-secret-not-for-production");
const gatewayJwtRefreshSecret =
  process.env.JWT_REFRESH_SECRET ||
  (requireStrictSecrets ? "" : "dev-only-refresh-secret-not-for-production");

if (
  requireStrictSecrets &&
  (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
) {
  throw new Error(
    "Gateway auth requires JWT_SECRET and JWT_REFRESH_SECRET in strict mode.",
  );
}

const requirePersistentSessionStore =
  process.env.NODE_ENV === "production" ||
  process.env.REQUIRE_DATABASE === "true";
const redisUrl = process.env.REDIS_URL;
if (requirePersistentSessionStore && !redisUrl) {
  throw new Error(
    "Gateway auth requires REDIS_URL for session/state persistence in strict mode.",
  );
}

// Initialize shared auth
initAuth({
  jwtSecret: gatewayJwtSecret,
  jwtRefreshSecret: gatewayJwtRefreshSecret,
  app: "gateway",
});

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const STATE_TTL_SECONDS = 10 * 60;
const AUTH_RATE_WINDOW_MS = Number.parseInt(
  process.env.GATEWAY_AUTH_RATE_WINDOW_MS || "60000",
  10,
);
const AUTH_RATE_LIMIT_MAX = Number.parseInt(
  process.env.GATEWAY_AUTH_RATE_LIMIT_MAX || "30",
  10,
);
const VERIFY_RATE_LIMIT_MAX = Number.parseInt(
  process.env.GATEWAY_VERIFY_RATE_LIMIT_MAX || "120",
  10,
);
const SESSION_IDLE_MAX_SECONDS = Number.parseInt(
  process.env.GATEWAY_SESSION_IDLE_MAX_SECONDS || "3600",
  10,
);

type SessionRecord = {
  user: GoogleUser;
  jwtToken: string;
  createdAt: string;
  lastSeenAt: string;
  userAgentHash: string;
  ipHash: string;
};

type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

function safeNowIso(): string {
  return new Date().toISOString();
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0]?.trim() || req.ip || "unknown";
  }
  if (Array.isArray(xff) && xff[0]) {
    return xff[0].split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || "unknown";
}

function getRequestFingerprint(req: Request): {
  userAgentHash: string;
  ipHash: string;
} {
  const ua = String(req.headers["user-agent"] || "unknown");
  const ip = getClientIp(req);
  return {
    userAgentHash: hashValue(ua),
    ipHash: hashValue(ip),
  };
}

function getRequestId(req: Request): string | undefined {
  const requestId = req.headers["x-request-id"];
  return typeof requestId === "string" ? requestId : undefined;
}

function logAuthAudit(
  event: string,
  req: Request,
  extras: Record<string, unknown> = {},
): void {
  const base = {
    ts: safeNowIso(),
    category: "gateway.auth.audit",
    event,
    requestId: getRequestId(req),
    method: req.method,
    path: req.path,
  };
  console.info(JSON.stringify({ ...base, ...extras }));
}

class GatewaySessionStore {
  private readonly redis?: IORedis;
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly pendingStates = new Map<string, { createdAt: Date }>();
  private readonly localRateBuckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(url?: string) {
    if (!url) {
      return;
    }

    this.redis = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on("error", (error) => {
      console.error("[Auth] Redis session store error:", error);
    });
  }

  private prunePendingStates(): void {
    const expiredBefore = Date.now() - STATE_TTL_SECONDS * 1000;
    for (const [key, value] of this.pendingStates.entries()) {
      if (value.createdAt.getTime() < expiredBefore) {
        this.pendingStates.delete(key);
      }
    }
  }

  private pruneSessions(): void {
    const expiredBefore = Date.now() - SESSION_TTL_SECONDS * 1000;
    for (const [key, value] of this.sessions.entries()) {
      const createdAtMs = Date.parse(value.createdAt);
      if (Number.isFinite(createdAtMs) && createdAtMs < expiredBefore) {
        this.sessions.delete(key);
      }
    }
  }

  async setPendingState(state: string): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        `gateway:auth:state:${state}`,
        "1",
        "EX",
        STATE_TTL_SECONDS,
      );
      return;
    }

    this.pendingStates.set(state, { createdAt: new Date() });
    this.prunePendingStates();
  }

  async consumePendingState(state: string): Promise<boolean> {
    if (this.redis) {
      const key = `gateway:auth:state:${state}`;
      const exists = await this.redis.get(key);
      if (!exists) return false;
      await this.redis.del(key);
      return true;
    }

    this.prunePendingStates();
    if (!this.pendingStates.has(state)) {
      return false;
    }
    this.pendingStates.delete(state);
    return true;
  }

  async setSession(sessionId: string, session: SessionRecord): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        `gateway:auth:session:${sessionId}`,
        JSON.stringify(session),
        "EX",
        SESSION_TTL_SECONDS,
      );
      return;
    }

    this.sessions.set(sessionId, session);
    this.pruneSessions();
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    if (this.redis) {
      const raw = await this.redis.get(`gateway:auth:session:${sessionId}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SessionRecord;
      } catch {
        return null;
      }
    }

    this.pruneSessions();
    return this.sessions.get(sessionId) ?? null;
  }

  async touchSession(sessionId: string, session: SessionRecord): Promise<void> {
    const updated: SessionRecord = {
      ...session,
      lastSeenAt: safeNowIso(),
    };
    await this.setSession(sessionId, updated);
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`gateway:auth:session:${sessionId}`);
      return;
    }

    this.sessions.delete(sessionId);
  }

  async consumeRateLimit(
    key: string,
    max: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();

    if (this.redis) {
      const bucketKey = `gateway:auth:ratelimit:${key}`;
      const tx = await this.redis
        .multi()
        .incr(bucketKey)
        .pexpire(bucketKey, windowMs, "NX")
        .pttl(bucketKey)
        .exec();
      const count = Number(tx?.[0]?.[1] || 0);
      const ttlMs = Number(tx?.[2]?.[1] || 0);
      if (count > max) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(Math.max(ttlMs, 1000) / 1000),
          ),
        };
      }
      return { allowed: true };
    }

    const existing = this.localRateBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.localRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }

    if (existing.count >= max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1000),
        ),
      };
    }

    existing.count += 1;
    this.localRateBuckets.set(key, existing);
    return { allowed: true };
  }
}

const sessionStore = new GatewaySessionStore(redisUrl);

/**
 * Generate JWT for cross-app SSO
 */
function generateSSOToken(user: GoogleUser): string {
  const authUser: AuthUser = {
    id: user.id,
    username: user.email,
    role: "user",
  };
  return generateAccessToken(authUser);
}

/**
 * Verify SSO token
 */
function verifySSOToken(token: string): Record<string, unknown> | null {
  const decoded = verifyAccessToken(token);
  if (!decoded || typeof decoded !== "object") {
    return null;
  }
  return decoded as Record<string, unknown>;
}

function isSessionStale(session: SessionRecord): boolean {
  const lastSeenMs = Date.parse(session.lastSeenAt || session.createdAt);
  if (!Number.isFinite(lastSeenMs)) return true;
  return Date.now() - lastSeenMs > SESSION_IDLE_MAX_SECONDS * 1000;
}

async function enforceRouteRateLimit(
  req: Request,
  max: number,
): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  return sessionStore.consumeRateLimit(
    `ip:${ip}:path:${req.path}`,
    max,
    AUTH_RATE_WINDOW_MS,
  );
}

/**
 * Check if Google OAuth is available
 */
router.get("/auth/status", (_req, res) => {
  res.json({
    googleOAuth: isGoogleOAuthConfigured(),
    sso: true,
    message: isGoogleOAuthConfigured()
      ? "Google OAuth is configured with SSO"
      : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
  });
});

/**
 * Start Google OAuth flow
 */
router.get("/auth/google", async (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }

  const routeLimit = await enforceRouteRateLimit(req, AUTH_RATE_LIMIT_MAX);
  if (!routeLimit.allowed) {
    res.setHeader("Retry-After", String(routeLimit.retryAfterSeconds || 60));
    return res.status(429).json({ error: "Too many auth attempts" });
  }

  const state = crypto.randomBytes(32).toString("hex");
  await sessionStore.setPendingState(state);
  logAuthAudit("oauth_state_issued", req, { stateHash: hashValue(state) });

  const authUrl = getAuthorizationUrl(state);
  res.redirect(authUrl);
});

/**
 * Handle Google OAuth callback
 */
router.get("/auth/google/callback", async (req, res) => {
  try {
    const routeLimit = await enforceRouteRateLimit(req, AUTH_RATE_LIMIT_MAX);
    if (!routeLimit.allowed) {
      res.setHeader("Retry-After", String(routeLimit.retryAfterSeconds || 60));
      return res.redirect("/?error=too_many_attempts");
    }

    const { code, state, error } = req.query;

    if (error) {
      logAuthAudit("oauth_callback_error", req, {
        providerError: String(error),
      });
      return res.redirect(`/?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      logAuthAudit("oauth_callback_invalid_request", req);
      return res.redirect("/?error=invalid_request");
    }

    const validState = await sessionStore.consumePendingState(state as string);
    if (!validState) {
      logAuthAudit("oauth_callback_invalid_state", req, {
        stateHash: hashValue(String(state)),
      });
      return res.redirect("/?error=invalid_state");
    }

    const tokens = await exchangeCodeForTokens(code as string);
    const googleUser = await getGoogleUserInfo(tokens.accessToken);
    const jwtToken = generateSSOToken(googleUser);

    const sessionId = crypto.randomBytes(32).toString("hex");
    const fingerprint = getRequestFingerprint(req);
    await sessionStore.setSession(sessionId, {
      user: googleUser,
      jwtToken,
      createdAt: safeNowIso(),
      lastSeenAt: safeNowIso(),
      userAgentHash: fingerprint.userAgentHash,
      ipHash: fingerprint.ipHash,
    });

    res.cookie("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS * 1000,
    });

    res.cookie("sso_token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS * 1000,
    });

    logAuthAudit("oauth_login_success", req, {
      userIdHash: hashValue(googleUser.id),
    });
    res.redirect(`/?login=success&name=${encodeURIComponent(googleUser.name)}`);
  } catch (error) {
    console.error("[Auth] Google callback error:", error);
    logAuthAudit("oauth_login_failed", req);
    res.redirect("/?error=auth_failed");
  }
});

/**
 * Get current user and SSO token
 */
router.get("/auth/me", async (req, res) => {
  const sessionId = req.cookies?.session;

  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await sessionStore.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (isSessionStale(session)) {
    await sessionStore.deleteSession(sessionId);
    logAuthAudit("session_stale_rejected", req);
    return res.status(401).json({ error: "Session expired" });
  }

  const fingerprint = getRequestFingerprint(req);
  if (
    session.userAgentHash !== fingerprint.userAgentHash ||
    session.ipHash !== fingerprint.ipHash
  ) {
    await sessionStore.deleteSession(sessionId);
    logAuthAudit("session_fingerprint_mismatch", req);
    return res.status(401).json({ error: "Session validation failed" });
  }

  await sessionStore.touchSession(sessionId, session);

  res.json({
    user: session.user,
    ssoToken: session.jwtToken,
    authenticated: true,
  });
});

/**
 * Verify SSO token - used by other apps for cross-app auth
 */
router.post("/auth/verify-token", async (req, res) => {
  const routeLimit = await enforceRouteRateLimit(req, VERIFY_RATE_LIMIT_MAX);
  if (!routeLimit.allowed) {
    res.setHeader("Retry-After", String(routeLimit.retryAfterSeconds || 60));
    return res
      .status(429)
      .json({ valid: false, error: "Too many token verification requests" });
  }

  let token = req.body?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.json({ valid: false, error: "No token provided" });
  }

  const decoded = verifySSOToken(token);
  if (decoded) {
    logAuthAudit("verify_token_success", req);
    res.json({
      valid: true,
      user: {
        id: typeof decoded.sub === "string" ? decoded.sub : null,
        email: typeof decoded.email === "string" ? decoded.email : null,
        name: typeof decoded.name === "string" ? decoded.name : null,
        picture: typeof decoded.picture === "string" ? decoded.picture : null,
      },
      app: "gateway",
    });
  } else {
    logAuthAudit("verify_token_failed", req);
    res.json({ valid: false, error: "Invalid or expired token" });
  }
});

/**
 * Logout
 */
router.post("/auth/logout", async (req, res) => {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    await sessionStore.deleteSession(sessionId);
  }
  logAuthAudit("logout", req);
  res.clearCookie("session");
  res.clearCookie("sso_token");
  res.json({ success: true });
});

export default router;
