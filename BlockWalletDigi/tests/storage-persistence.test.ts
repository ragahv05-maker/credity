import { describe, expect, it } from "vitest";
import { MemStorage } from "../server/storage";

describe("Wallet storage persistence", () => {
  it("restores users, credentials, and activities from exported state", async () => {
    const source = new MemStorage();

    const user = await source.createUser({
      username: `holder_${Date.now()}`,
      password: "Password#123",
      did: "did:key:z6MkWalletPersistence",
    } as any);

    const credential = await source.createCredential({
      userId: user.id,
      type: ["VerifiableCredential", "IdentityCredential"],
      issuer: "CredVerse Issuer",
      issuanceDate: new Date(),
      data: { name: "Holder User" },
      jwt: "eyJhbGciOiJIUzI1NiJ9.e30.signature",
    } as any);

    await source.createActivity({
      userId: user.id,
      type: "receive",
      description: "Received credential for persistence test",
    } as any);

    const snapshot = source.exportState();
    const restored = new MemStorage();
    restored.importState(snapshot);

    const restoredUser = await restored.getUser(user.id);
    expect(restoredUser?.username).toBe(user.username);

    const restoredCredential = await restored.getCredential(credential.id);
    expect(restoredCredential?.issuer).toBe("CredVerse Issuer");
    expect(restoredCredential?.issuanceDate instanceof Date).toBe(true);

    const activities = await restored.listActivities(user.id);
    expect(activities.length).toBeGreaterThanOrEqual(1);
    expect(activities[0]?.timestamp instanceof Date).toBe(true);
  });
});
