import { describe, expect, it } from "vitest";
import { MemStorage } from "../server/storage";

describe("Recruiter storage persistence", () => {
  it("restores users and verification history from exported state", async () => {
    const source = new MemStorage();

    const user = await source.createUser({
      username: `recruiter_${Date.now()}`,
      password: "Password#123",
    } as any);

    await source.addVerification({
      id: `verify_${Date.now()}`,
      credentialType: "EmploymentCredential",
      issuer: "CredVerse Issuer",
      subject: "Candidate A",
      status: "verified",
      riskScore: 12,
      fraudScore: 5,
      recommendation: "accept",
      timestamp: new Date(),
      verifiedBy: user.username,
    });

    const snapshot = source.exportState();
    const restored = new MemStorage();
    restored.importState(snapshot);

    const restoredUser = await restored.getUser(user.id);
    expect(restoredUser?.username).toBe(user.username);

    const history = await restored.getVerifications();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]?.timestamp instanceof Date).toBe(true);
    expect(history[0]?.verifiedBy).toBe(user.username);
  });
});
