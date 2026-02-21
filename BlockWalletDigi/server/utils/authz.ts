import type { Request, Response } from "express";

interface UserIdResolutionOptions {
  bodyKey?: string;
  queryKey?: string;
  required?: boolean;
}

function sendAuthError(
  res: Response,
  status: number,
  error: string,
  code: string,
): null {
  res.status(status).json({ error, code });
  return null;
}

export function getAuthenticatedUserId(
  req: Request,
  res: Response,
): number | null {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return sendAuthError(res, 401, "Authentication required", "AUTH_REQUIRED");
  }

  return userId;
}

export function resolveBoundUserId(
  req: Request,
  res: Response,
  options: UserIdResolutionOptions = {},
): number | null {
  const authUserId = getAuthenticatedUserId(req, res);
  if (!authUserId) {
    return null;
  }

  const { bodyKey = "userId", queryKey = "userId", required = false } = options;

  const candidateValues: unknown[] = [];
  if (bodyKey && typeof req.body === "object" && req.body !== null) {
    candidateValues.push((req.body as Record<string, unknown>)[bodyKey]);
  }
  if (queryKey) {
    candidateValues.push((req.query as Record<string, unknown>)[queryKey]);
  }

  const provided = candidateValues.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

  if (provided !== undefined) {
    const parsed = Number(provided);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return sendAuthError(
        res,
        400,
        "userId must be a positive integer",
        "INVALID_USER_ID",
      );
    }

    if (parsed !== authUserId) {
      return sendAuthError(
        res,
        403,
        "userId does not match authenticated user",
        "AUTH_USER_MISMATCH",
      );
    }
  } else if (required) {
    return sendAuthError(res, 400, "userId is required", "USER_ID_REQUIRED");
  }

  return authUserId;
}
