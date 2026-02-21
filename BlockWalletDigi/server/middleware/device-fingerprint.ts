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
  // SECURITY: Ignore client-supplied 'x-device-fingerprint' header to prevent spoofing.
  // Generate fingerprint server-side based on request properties.

  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : undefined)
    ?? req.socket?.remoteAddress
    ?? 'unknown';

  const ua = req.headers['user-agent'] ?? 'unknown';
  const acceptLang = req.headers['accept-language'] ?? 'unknown';

  req.deviceFingerprint = sha256(ip, ua, acceptLang);
  next();
}
