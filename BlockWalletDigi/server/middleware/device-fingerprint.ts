import type { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      deviceFingerprint: string;
    }
  }
}

function sha256(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

export function deviceFingerprintMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const headerFp = req.headers['x-device-fingerprint'];
  if (typeof headerFp === 'string' && headerFp.trim().length > 0) {
    req.deviceFingerprint = headerFp.trim();
  } else {
    const ip = (req.headers['x-forwarded-for'] as string | undefined) ?? req.socket?.remoteAddress ?? 'unknown';
    const ua = req.headers['user-agent'] ?? 'unknown';
    req.deviceFingerprint = sha256(ip, ua);
  }
  next();
}
