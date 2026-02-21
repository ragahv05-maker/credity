import { Request, Response, NextFunction } from "express";
import { captureException } from "../services/sentry";
import {
  ERROR_CODES,
  getRequestContext,
  sanitizeContext,
} from "../services/observability";

type GatewayError = Error & {
  status?: number;
  statusCode?: number;
  code?: string;
};

function resolveError(err: unknown): {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
} {
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "ZodError"
  ) {
    const issues =
      (
        err as {
          issues?: Array<{
            path?: Array<string | number>;
            message?: string;
            code?: string;
          }>;
        }
      ).issues || [];
    return {
      message: "Validation Error",
      code: ERROR_CODES.VALIDATION,
      statusCode: 400,
      details: {
        issues: issues.map((issue) => ({
          path: Array.isArray(issue.path) ? issue.path.join(".") : "",
          message: issue.message,
          code: issue.code,
        })),
      },
    };
  }

  if (err instanceof SyntaxError && "body" in (err as object)) {
    return {
      message: "Invalid JSON payload",
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
    };
  }

  const maybeErr = err as GatewayError;
  if (
    maybeErr?.name === "UnauthorizedError" ||
    maybeErr?.message === "jwt malformed"
  ) {
    return {
      message: "Invalid or Expired Token",
      code: ERROR_CODES.AUTH_INVALID_TOKEN,
      statusCode: 401,
    };
  }

  return {
    message: maybeErr?.message || "Internal Server Error",
    code: maybeErr?.code || ERROR_CODES.INTERNAL,
    statusCode: maybeErr?.status || maybeErr?.statusCode || 500,
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const resolved = resolveError(err);
  const requestContext = getRequestContext(req);
  const context = sanitizeContext({
    errorCode: resolved.code,
    statusCode: resolved.statusCode,
    request: requestContext,
    details: resolved.details,
  }) as Record<string, unknown>;

  console.error("[GatewayError]", context, err);
  captureException(
    err instanceof Error ? err : new Error(resolved.message),
    context,
  );

  if (!res.headersSent) {
    return res.status(resolved.statusCode).json({
      message: resolved.message,
      code: resolved.code,
      requestId: requestContext.requestId,
    });
  }
}
