import type { Request } from "express";

export const ERROR_CODES = {
  INTERNAL: "APP.INTERNAL",
  VALIDATION: "APP.VALIDATION_FAILED",
  AUTH_INVALID_TOKEN: "AUTH.INVALID_TOKEN",
  AUTH_UNAUTHORIZED: "AUTH.UNAUTHORIZED",
  BAD_REQUEST: "HTTP.BAD_REQUEST",
  NOT_FOUND: "HTTP.NOT_FOUND",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | string;

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const SENSITIVE_KEYWORDS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "key",
  "otp",
  "email",
  "phone",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((value) => lower.includes(value));
}

export function sanitizeContext(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string")
    return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value))
    return value.slice(0, 20).map((entry) => sanitizeContext(entry, depth + 1));

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      sanitized[key] = isSensitiveKey(key)
        ? "[REDACTED]"
        : sanitizeContext(entry, depth + 1);
    }

    return sanitized;
  }

  return String(value);
}

export function getRequestContext(req: Request): Record<string, unknown> {
  const requestId = req.headers["x-request-id"];
  return {
    requestId: typeof requestId === "string" ? requestId : undefined,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  };
}
