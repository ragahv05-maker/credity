import pino from "pino";

/**
 * Structured Logger for CredVerse
 * Uses Pino for high-performance JSON logging
 */

const isDevelopment = process.env.NODE_ENV !== "production";

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),

  // Pretty print in development
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,

  // Base fields included in every log
  base: {
    app: process.env.APP_NAME || "credverse-issuer",
    env: process.env.NODE_ENV || "development",
  },

  // Redact sensitive fields
  redact: {
    paths: [
      "password",
      "token",
      "*.token",
      "authorization",
      "cookie",
      "*.cookie",
      "privateKey",
      "*.privateKey",
      "secret",
      "*.secret",
      "refreshToken",
      "*.refreshToken",
      "accessToken",
      "*.accessToken",
      "email",
      "*.email",
      "phone",
      "*.phone",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
  });
}

/**
 * Log an API request
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  requestId?: string,
) {
  logger.info(
    {
      type: "http_request",
      method,
      path,
      statusCode,
      durationMs,
      requestId,
    },
    `${method} ${path} ${statusCode} ${durationMs}ms`,
  );
}

/**
 * Log a business event
 */
export function logEvent(event: string, data?: Record<string, any>) {
  logger.info(
    {
      type: "event",
      event,
      ...data,
    },
    event,
  );
}

/**
 * Log an error with context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      type: "error",
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    },
    error.message,
  );
}

// Export log levels for convenience
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};

export default logger;
