import { Request, Response, NextFunction, Application } from "express";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import xss from "xss";

/**
 * Shared Security Middleware
 * comprehensive protection against common web vulnerabilities
 */

// =============================================================================
// RATE LIMITING
// =============================================================================

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable IPv6 key generator validation
  keyGenerator: (req: Request) =>
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.ip ||
    "unknown",
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter for auth
  message: {
    error:
      "Too many authentication attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable IPv6 key generator validation
  skipSuccessfulRequests: true,
});

// =============================================================================
// INPUT SANITIZATION W/ XSS
// =============================================================================

/**
 * Sanitize string using xss library
 */
export function sanitizeInput(input: string): string {
  return xss(input);
}

/**
 * Deep sanitize object
 */
export function deepSanitize<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeInput(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys too to prevent prototype pollution via keys
      sanitized[sanitizeInput(key)] = deepSanitize(value);
    }
    return sanitized as T;
  }
  return obj;
}

export function sanitizationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query) as typeof req.query;
  if (req.params) req.params = deepSanitize(req.params);
  next();
}

// =============================================================================
// WAF-LITE (Suspicious Requests)
// =============================================================================

const SUSPICIOUS_PATTERNS = [
  /(?:^|\s)--(?:$|\s)/, // SQL injection (comment patterns)
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi, // XSS script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers
  /eval\s*\(/gi, // eval() calls
  /expression\s*\(/gi, // CSS expression
  /\.\.\//g, // Path traversal
];

export function suspiciousRequestDetector(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const checkValue = (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(value));
  };

  const checkObject = (obj: unknown): boolean => {
    if (typeof obj === "string") return checkValue(obj);
    if (Array.isArray(obj)) return obj.some(checkObject);
    if (obj !== null && typeof obj === "object") {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  if (checkValue(req.path) || checkObject(req.query) || checkObject(req.body)) {
    console.warn(`[SECURITY] Suspicious activity blocked from ${req.ip}`);
    res.status(403).json({ error: "Request blocked by security filter" });
    return;
  }
  next();
}

// =============================================================================
// COMPOSITE SETUP
// =============================================================================

interface SecurityConfig {
  allowedOrigins?: string[];
  enableRateLimit?: boolean;
}

export function setupSecurity(app: Application, config: SecurityConfig = {}) {
  const isDev = process.env.NODE_ENV !== "production";

  // 1. Basic Headers (Helmet) - with dev-friendly settings
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: isDev ? false : undefined,
      crossOriginResourcePolicy: isDev ? false : undefined,
    }),
  );

  // 2. CORS
  app.use(
    cors({
      origin:
        config.allowedOrigins ||
        process.env.ALLOWED_ORIGINS?.split(",") ||
        true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-API-Key",
        "Idempotency-Key",
        "X-Webhook-Signature",
        "X-Webhook-Timestamp",
      ],
    }),
  );

  // 3. HPP (Parameter Pollution)
  app.use(hpp());

  // 4. Rate Limiting
  if (config.enableRateLimit !== false) {
    app.use("/api/", apiRateLimiter); // Apply to all API routes
    app.use("/api/auth/", authRateLimiter); // Stricter for auth
  }

  // 5. Custom Middlewares
  app.use(suspiciousRequestDetector);
  // app.use(sanitizationMiddleware); // Removed: context-unaware sanitization corrupts data (e.g. passwords)

  // 6. Request ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId =
      (req.headers["x-request-id"] as string) || crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).id = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  });
}
