import { describe, expect, it } from "vitest";
import {
  deterministicHash,
  deterministicHashLegacyTopLevel,
} from "../server/services/proof-lifecycle";

describe("issuer proof lifecycle hashing", () => {
  it("produces deterministic hashes for nested objects regardless of key order", () => {
    const a = {
      id: "cred-1",
      data: { degree: "B.Tech", score: 9.1 },
      issuer: { id: "did:key:issuer" },
    };
    const b = {
      issuer: { id: "did:key:issuer" },
      data: { score: 9.1, degree: "B.Tech" },
      id: "cred-1",
    };

    expect(deterministicHash(a, "keccak256", "RFC8785-V1")).toBe(
      deterministicHash(b, "keccak256", "RFC8785-V1"),
    );
  });

  it("keeps legacy top-level hash path distinct for backward compatibility", () => {
    const payload = { top: "x", nested: { a: 1, b: 2 } };

    const strict = deterministicHash(payload, "keccak256", "RFC8785-V1");
    const legacy = deterministicHashLegacyTopLevel(payload, "keccak256");

    expect(strict).not.toBe("");
    expect(legacy).not.toBe("");
    expect(typeof strict).toBe("string");
    expect(typeof legacy).toBe("string");
  });

  it("differentiates strict canonical JSON from legacy top-level fallback for nested payloads", () => {
    const payload = {
      credential_id: "cred-issuer-1",
      claims_digest: "abc123",
      nested: { second: 2, first: 1 },
      arr: [{ z: 9, a: 1 }],
    };

    const strict = deterministicHash(payload, "sha256", "RFC8785-V1");
    const legacy = deterministicHashLegacyTopLevel(payload, "sha256");

    expect(strict).not.toBe(legacy);
  });

  it("rejects non-finite numbers in strict canonicalization", () => {
    expect(() =>
      deterministicHash({ score: Number.NaN }, "sha256", "RFC8785-V1"),
    ).toThrow(/Non-finite numbers/i);
    expect(() =>
      deterministicHash(
        { score: Number.POSITIVE_INFINITY },
        "sha256",
        "RFC8785-V1",
      ),
    ).toThrow(/Non-finite numbers/i);
  });

  it("rejects non-plain objects in strict canonicalization", () => {
    expect(() =>
      deterministicHash(
        { when: new Date("2026-02-14T00:00:00.000Z") },
        "sha256",
        "RFC8785-V1",
      ),
    ).toThrow(/plain JSON objects/i);
  });
});
