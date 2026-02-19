const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'otp',
  'email',
  'phone',
  'privatekey',
  'accesstoken',
  'refreshtoken',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((value) => lower.includes(value));
}

export function sanitizeForLogging(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string')
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value))
    return value
      .slice(0, 20)
      .map((entry) => sanitizeForLogging(entry, depth + 1));

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(entry, depth + 1);
      }
    }

    return sanitized;
  }

  return String(value);
}
