import { describe, it, expect } from "vitest";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  verifyAccessToken,
} from "../server/services/auth-service";

describe("Auth Utilities", () => {
  it("should hash and verify password", async () => {
    const password = "password123";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword("wrongpass", hash);
    expect(isInvalid).toBe(false);
  });

  it("should generate and verify access token", () => {
    const user = { id: "1", username: "test", role: "admin" as const };
    const token = generateAccessToken(user);
    expect(token).toBeDefined();

    const payload = verifyAccessToken(token);
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe("1");
    expect(payload?.username).toBe("test");
  });
});
