const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeScalar(value: unknown): string | number | boolean | null {
  if (typeof value === "string") {
    return value.slice(0, 1000);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

export function sanitizeUnsafeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";

  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return sanitizeScalar(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((entry) => sanitizeUnsafeMetadata(entry, depth + 1));
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).slice(0, 50)) {
    if (BLOCKED_KEYS.has(key)) continue;
    result[key] = sanitizeUnsafeMetadata(entry, depth + 1);
  }

  return result;
}
