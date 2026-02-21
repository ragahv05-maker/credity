import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import crypto from "crypto";

/**
 * Security Middleware Module
 * Provides comprehensive protection against common web vulnerabilities
 */

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For if behind a proxy, otherwise use IP
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.ip ||
      "unknown"
    );
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error:
      "Too many authentication attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Credential issuance rate limiter
 * Limits: 50 requests per hour per IP
 */
export const issuanceRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    error: "Too many credential issuance requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// =============================================================================
// HTTP PARAMETER POLLUTION PROTECTION
// =============================================================================

/**
 * Protect against HTTP Parameter Pollution attacks
 */
export const hppProtection = hpp({
  whitelist: ["sort", "filter", "fields", "page", "limit"], // Allow these to have multiple values
});

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#96;")
    .replace(/=/g, "&#x3D;");
}

/**
 * Deep sanitize an object (recursively sanitizes all string values)
 */
export function deepSanitize<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeInput(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize) as T;
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = deepSanitize(value);
    }
    return sanitized as T;
  }
  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 */
export function sanitizationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body) {
    req.body = deepSanitize(req.body);
  }
  if (req.query) {
    req.query = deepSanitize(req.query) as typeof req.query;
  }
  if (req.params) {
    req.params = deepSanitize(req.params);
  }
  next();
}

// =============================================================================
// REQUEST ID TRACKING
// =============================================================================

/**
 * Add unique request ID for audit logging
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}

// =============================================================================
// SECURITY HEADERS (Additional to helmet)
// =============================================================================

/**
 * Additional security headers not covered by helmet defaults
 */
export function additionalSecurityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Prevent browsers from caching sensitive data
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  next();
}

// =============================================================================
// SUSPICIOUS REQUEST DETECTION
// =============================================================================

const SUSPICIOUS_PATTERNS = [
  /(\%27)|(\')|(\\-\\-)|(\\%23)|(#)/i, // SQL injection
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi, // XSS script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers
  /eval\s*\(/gi, // eval() calls
  /expression\s*\(/gi, // CSS expression
  /\.\.\//g, // Path traversal
];

/**
 * Detect and block suspicious requests
 */
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

  // Check URL path
  if (checkValue(req.path)) {
    console.warn(
      `[SECURITY] Suspicious path detected: ${req.path} from ${req.ip}`,
    );
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  // Check query parameters
  if (checkObject(req.query)) {
    console.warn(`[SECURITY] Suspicious query detected from ${req.ip}`);
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  // Check body
  if (checkObject(req.body)) {
    console.warn(`[SECURITY] Suspicious body detected from ${req.ip}`);
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  next();
}

// =============================================================================
// IP BLOCKLIST
// =============================================================================

const blockedIPs = new Set<string>();

/**
 * Add an IP to the blocklist
 */
export function blockIP(ip: string): void {
  blockedIPs.add(ip);
}

/**
 * Remove an IP from the blocklist
 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
}

/**
 * Middleware to block requests from blocked IPs
 */
export function ipBlocklistMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const clientIP =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "";

  if (blockedIPs.has(clientIP)) {
    console.warn(`[SECURITY] Blocked request from banned IP: ${clientIP}`);
    res.status(403).json({ error: "Access denied" });
    return;
  }

  next();
}

// =============================================================================
// EXPORT ALL MIDDLEWARE AS A BUNDLE
// =============================================================================

export const securityMiddleware = {
  apiRateLimiter,
  authRateLimiter,
  issuanceRateLimiter,
  hppProtection,
  sanitizationMiddleware,
  requestIdMiddleware,
  additionalSecurityHeaders,
  suspiciousRequestDetector,
  ipBlocklistMiddleware,
};

export default securityMiddleware;
