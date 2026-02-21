import crypto from "crypto";
import { ethers } from "ethers";

export type ProofAlgorithm = "sha256" | "keccak256";
export type ProofCanonicalization = "RFC8785-V1" | "JCS-LIKE-V1";

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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => canonicalize(v));
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(record[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalString(
  value: unknown,
  canonicalization: ProofCanonicalization = "RFC8785-V1",
): string {
  if (canonicalization === "RFC8785-V1") {
    assertJsonValueForCanonicalization(value);
  }
  return JSON.stringify(canonicalize(value));
}

export function deterministicHash(
  value: unknown,
  algorithm: ProofAlgorithm,
  canonicalization: ProofCanonicalization = "RFC8785-V1",
): string {
  const content = canonicalString(value, canonicalization);
  if (algorithm === "keccak256") {
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Historical behavior used JSON.stringify(data, Object.keys(data).sort()) which whitelists
// top-level keys and can truncate nested fields. Keep only for backward verification.
export function deterministicHashLegacyTopLevel(
  value: unknown,
  algorithm: ProofAlgorithm,
): string {
  const canonical =
    typeof value === "string"
      ? value
      : JSON.stringify(
          value,
          value && typeof value === "object"
            ? Object.keys(value as Record<string, unknown>).sort()
            : undefined,
        );

  if (algorithm === "keccak256") {
    return ethers.keccak256(ethers.toUtf8Bytes(canonical));
  }

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function parseProofAlgorithm(value: unknown): ProofAlgorithm {
  return value === "keccak256" ? "keccak256" : "sha256";
}

export function parseCanonicalization(value: unknown): ProofCanonicalization {
  return value === "JCS-LIKE-V1" ? "JCS-LIKE-V1" : "RFC8785-V1";
}
