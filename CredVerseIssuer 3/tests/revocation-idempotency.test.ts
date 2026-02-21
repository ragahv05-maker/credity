import { beforeEach, describe, expect, it } from "vitest";
import { issuanceService, RevocationError } from "../server/services/issuance";
import { storage } from "../server/storage";

describe("revocation idempotency", () => {
  beforeEach(() => {
    (storage as any).credentials.clear();
  });

  it("returns alreadyRevoked=true for duplicate revocation requests", async () => {
    const credential = await storage.createCredential({
      tenantId: "tenant-1",
      templateId: "template-1",
      issuerId: "issuer-1",
      recipient: {},
      credentialData: {},
      vcJwt: "jwt",
    } as any);

    const first = await issuanceService.revokeCredential(credential.id, "test");
    const second = await issuanceService.revokeCredential(
      credential.id,
      "test",
    );

    expect(first.alreadyRevoked).toBe(false);
    expect(second.alreadyRevoked).toBe(true);
  });

  it("throws typed error when credential does not exist", async () => {
    await expect(
      issuanceService.revokeCredential("missing-credential", "test"),
    ).rejects.toMatchObject({
      name: "RevocationError",
      code: "CREDENTIAL_NOT_FOUND",
      status: 404,
    } satisfies Partial<RevocationError>);
  });
});
