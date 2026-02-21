import { describe, it, expect } from "vitest";

describe("CredVerseRecruiter", () => {
  it("should have valid schema exports", async () => {
    const schema = await import("../shared/schema");
    expect(schema.users).toBeDefined();
    expect(schema.insertUserSchema).toBeDefined();
  });
});
