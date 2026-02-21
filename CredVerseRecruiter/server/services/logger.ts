import pino from "pino";

/**
 * Structured Logger for CredVerse Recruiter
 */

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
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
  base: {
    app: "credverse-recruiter",
    env: process.env.NODE_ENV || "development",
  },
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

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}

export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  requestId?: string,
) {
  logger.info(
    { type: "http_request", method, path, statusCode, durationMs, requestId },
    `${method} ${path} ${statusCode} ${durationMs}ms`,
  );
}

export function logEvent(event: string, data?: Record<string, any>) {
  logger.info({ type: "event", event, ...data }, event);
}

export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      type: "error",
      error: { name: error.name, message: error.message, stack: error.stack },
      ...context,
    },
    error.message,
  );
}

export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};

export default logger;
