import { describe, expect, it } from "vitest";
import { MemStorage } from "../server/storage";

describe("Issuer storage persistence", () => {
  it("restores users and credentials from exported state", async () => {
    const source = new MemStorage();

    const user = await source.createUser({
      username: `issuer_${Date.now()}`,
      password: "Password#123",
      role: "issuer",
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
    } as any);

    const credential = await source.createCredential({
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      templateId: "template-1",
      issuerId: "issuer-1",
      recipient: { did: "did:key:z6MkPersistenceSubject" },
      credentialData: { source: "storage-persistence-test" },
      format: "sd-jwt-vc",
    } as any);

    const snapshot = source.exportState();

    const restored = new MemStorage();
    restored.importState(snapshot);

    const restoredUser = await restored.getUser(user.id);
    expect(restoredUser?.username).toBe(user.username);
    expect(restoredUser?.createdAt instanceof Date).toBe(true);

    const restoredCredential = await restored.getCredential(credential.id);
    expect(restoredCredential?.id).toBe(credential.id);
    expect(restoredCredential?.createdAt instanceof Date).toBe(true);
  });
});
