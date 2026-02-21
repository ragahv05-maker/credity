import crypto from "crypto";

export type ProofHashAlgorithm = "sha256";
export type ProofCanonicalization = "RFC8785-V1" | "JCS-LIKE-V1";

export interface DeterministicProofMetadata {
  algorithm: ProofHashAlgorithm;
  hash: string;
  canonicalization: ProofCanonicalization;
  generatedAt: string;
  proofVersion: "1.0";
}

function assertJsonValueForCanonicalization(value: unknown): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Non-finite numbers are not allowed in canonical JSON");
  }

  if (typeof value === "bigint") {
    throw new TypeError("BigInt is not supported in canonical JSON");
  }

  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      for (const item of value) {
        assertJsonValueForCanonicalization(item);
      }
      return;
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError(
        "Only plain JSON objects are supported for canonical JSON",
      );
    }

    for (const item of Object.values(value as Record<string, unknown>)) {
      assertJsonValueForCanonicalization(item);
    }
  }
}

function canonicalizeValueRFC8785(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValueRFC8785(item));
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalizeValueRFC8785(obj[key]);
        return acc;
      }, {});
  }

  return value;
}

function deterministicCanonicalStringRFC8785(value: unknown): string {
  assertJsonValueForCanonicalization(value);
  return JSON.stringify(canonicalizeValueRFC8785(value));
}

function canonicalizeValueLegacy(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValueLegacy(item));
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalizeValueLegacy(obj[key]);
        return acc;
      }, {});
  }

  return value;
}

function deterministicCanonicalStringLegacy(value: unknown): string {
  return JSON.stringify(canonicalizeValueLegacy(value));
}

export function deterministicCanonicalString(value: unknown): string {
  return deterministicCanonicalStringRFC8785(value);
}

export function computeDeterministicHash(
  value: unknown,
  algorithm: ProofHashAlgorithm = "sha256",
  canonicalization: ProofCanonicalization = "RFC8785-V1",
): string {
  const canonical =
    canonicalization === "JCS-LIKE-V1"
      ? deterministicCanonicalStringLegacy(value)
      : deterministicCanonicalStringRFC8785(value);

  if (algorithm === "sha256") {
    return crypto.createHash("sha256").update(canonical).digest("hex");
  }

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function createProofMetadata(
  value: unknown,
  algorithm: ProofHashAlgorithm = "sha256",
): DeterministicProofMetadata {
  return {
    algorithm,
    hash: computeDeterministicHash(value, algorithm, "RFC8785-V1"),
    canonicalization: "RFC8785-V1",
    generatedAt: new Date().toISOString(),
    proofVersion: "1.0",
  };
}

export function verifyDeterministicProof(
  value: unknown,
  proof: Pick<DeterministicProofMetadata, "algorithm" | "hash"> &
    Partial<Pick<DeterministicProofMetadata, "canonicalization">>,
): { valid: boolean; computedHash: string } {
  const canonicalization = proof.canonicalization || "RFC8785-V1";
  const computedHash = computeDeterministicHash(
    value,
    proof.algorithm,
    canonicalization,
  );

  if (computedHash === proof.hash) {
    return { valid: true, computedHash };
  }

  // Backward compatibility for historical proofs generated with JCS-LIKE-V1.
  if (canonicalization !== "JCS-LIKE-V1") {
    const legacyComputedHash = computeDeterministicHash(
      value,
      proof.algorithm,
      "JCS-LIKE-V1",
    );
    if (legacyComputedHash === proof.hash) {
      return { valid: true, computedHash: legacyComputedHash };
    }
  }

  return { valid: false, computedHash };
}
