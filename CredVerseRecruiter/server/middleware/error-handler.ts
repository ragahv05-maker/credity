import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { captureException } from "../services/sentry";
import { logError } from "../services/logger";
import {
  AppError,
  ERROR_CODES,
  getRequestContext,
  sanitizeContext,
} from "./observability";

function resolveError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    return new AppError("Validation Error", ERROR_CODES.VALIDATION, 400, {
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  if (err instanceof SyntaxError && "body" in (err as object)) {
    return new AppError("Invalid JSON payload", ERROR_CODES.BAD_REQUEST, 400);
  }

  if (typeof err === "object" && err !== null) {
    const maybeErr = err as {
      name?: string;
      message?: string;
      status?: number;
      statusCode?: number;
      code?: string;
    };
    if (
      maybeErr.name === "UnauthorizedError" ||
      maybeErr.message === "jwt malformed"
    ) {
      return new AppError(
        "Invalid or Expired Token",
        ERROR_CODES.AUTH_INVALID_TOKEN,
        401,
      );
    }

    return new AppError(
      maybeErr.message || "Internal Server Error",
      maybeErr.code || ERROR_CODES.INTERNAL,
      maybeErr.status || maybeErr.statusCode || 500,
    );
  }

  return new AppError("Internal Server Error", ERROR_CODES.INTERNAL, 500);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const resolvedError = resolveError(err);
  const requestContext = getRequestContext(req);

  const observabilityContext = sanitizeContext({
    errorCode: resolvedError.code,
    statusCode: resolvedError.statusCode,
    request: requestContext,
    details: resolvedError.details,
  }) as Record<string, unknown>;

  logError(resolvedError, observabilityContext);
  captureException(resolvedError, observabilityContext);

  if (!res.headersSent) {
    return res.status(resolvedError.statusCode).json({
      message: resolvedError.message,
      code: resolvedError.code,
      requestId: requestContext.requestId,
    });
  }
}

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
