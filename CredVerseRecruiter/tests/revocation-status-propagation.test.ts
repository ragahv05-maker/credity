import { afterEach, describe, expect, it, vi } from "vitest";
import { verificationEngine } from "../server/services/verification-engine";

describe("revocation/status propagation across issuer verification paths", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back from issuer status endpoint to verify endpoint and maps as active", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch" as any)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "temporary failure" }), {
          status: 500,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ revoked: false }), { status: 200 }),
      );

    const result = await verificationEngine.verifyCredential({
      raw: {
        id: "cred-fallback-active",
        issuer: {
          id: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72",
        },
        proof: { type: "DataIntegrityProof" },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const revocation = result.checks.find((c) => c.name === "Revocation Check");
    expect(revocation?.status).toBe("passed");
    expect(revocation?.details?.code).toBe("REVOCATION_CONFIRMED");
    expect(result.riskFlags).not.toContain("REVOKED_CREDENTIAL");
  });

  it("maps issuer 404 to explicit failed revocation outcome", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch" as any)
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/api/v1/public/registry/issuers/did/")) {
          return new Response(JSON.stringify({ verified: true }), {
            status: 200,
          });
        }

        if (url.includes("/api/v1/credentials/") && url.includes("/status")) {
          return new Response(
            JSON.stringify({ message: "Credential not found" }),
            { status: 404 },
          );
        }

        return new Response(
          JSON.stringify({ message: "unexpected fetch in test", url }),
          { status: 500 },
        );
      });

    const result = await verificationEngine.verifyCredential({
      raw: {
        id: "cred-missing",
        issuer: {
          id: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72",
        },
        proof: { type: "DataIntegrityProof" },
      },
    });

    expect(fetchMock).toHaveBeenCalled();
    const revocation = result.checks.find((c) => c.name === "Revocation Check");
    expect(revocation?.status).toBe("failed");
    expect(revocation?.details?.code).toBe("ISSUER_CREDENTIAL_NOT_FOUND");
    expect(result.riskFlags).toContain("REVOKED_CREDENTIAL");
  });
});
