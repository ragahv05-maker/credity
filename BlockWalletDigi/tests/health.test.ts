import { describe, it, expect } from "vitest";

describe("BlockWalletDigi", () => {
  it("should have valid schema exports", async () => {
    const schema = await import("../shared/schema");
    expect(schema.users).toBeDefined();
    expect(schema.credentials).toBeDefined();
    expect(schema.activities).toBeDefined();
    expect(schema.claims).toBeDefined();
    expect(schema.insertUserSchema).toBeDefined();
    expect(schema.insertCredentialSchema).toBeDefined();
  });
});
