import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadVcSigner() {
  vi.resetModules();
  return import("../server/services/vc-signer");
}

function decodeHeader(jwt: string): { kid?: string } {
  const [encodedHeader] = jwt.split(".");
  return JSON.parse(Buffer.from(encodedHeader, "base64url").toString());
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("vc-signer key management", () => {
  it("preserves verification for old JWTs after signer-key rotation via kid lookup", async () => {
    process.env.NODE_ENV = "test";
    process.env.ISSUER_KEY_ENCRYPTION = "1".repeat(64);

    const signer = await loadVcSigner();

    const issuerDid = "did:web:issuer.example";
    const payload = {
      iss: issuerDid,
      sub: "did:key:z6MkStudent",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      vc: { id: "urn:uuid:cred-1" },
    };

    const jwtBefore = await signer.signVcJwt(payload, issuerDid);
    const kidBefore = decodeHeader(jwtBefore).kid;
    expect(kidBefore).toBe(`${issuerDid}#keys-1`);

    const oldPublicKey = signer.getIssuerPublicKey(issuerDid, kidBefore);
    expect(oldPublicKey).toBeTruthy();

    const rotateResult = signer.rotateIssuerSigningKey(issuerDid);
    expect(rotateResult.kid).toBe(`${issuerDid}#keys-2`);

    const jwtAfter = await signer.signVcJwt(payload, issuerDid);
    const kidAfter = decodeHeader(jwtAfter).kid;
    expect(kidAfter).toBe(`${issuerDid}#keys-2`);

    const verifyOld = await signer.verifyVcJwt(jwtBefore, oldPublicKey!);
    expect(verifyOld.valid).toBe(true);
  });

  it("supports encryption-key rotation hooks without breaking in-memory signer keys", async () => {
    process.env.NODE_ENV = "test";
    process.env.ISSUER_KEY_ENCRYPTION = "2".repeat(64);
    process.env.ISSUER_KEY_ENCRYPTION_PREVIOUS = "3".repeat(64);

    const signer = await loadVcSigner();
    const issuerDid = "did:web:rotate.example";

    const first = signer.getOrCreateIssuerKey(issuerDid);
    expect(first.kid).toBe(`${issuerDid}#keys-1`);

    const result = signer.rotateIssuerEncryptionKeys();
    expect(result.issuersUpdated).toBeGreaterThanOrEqual(1);
    expect(result.keysReencrypted).toBeGreaterThanOrEqual(1);

    const second = signer.getOrCreateIssuerKey(issuerDid);
    expect(second.kid).toBe(first.kid);
    expect(second.publicKey).toBe(first.publicKey);

    const status = signer.getKeyManagementStatus(issuerDid);
    expect(status.keyCount).toBeGreaterThanOrEqual(1);
    expect(status.encryptionFallbackKeys).toBe(1);
  });
});
