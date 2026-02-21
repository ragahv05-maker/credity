import { afterEach, describe, expect, it } from "vitest";
import { DigiLockerService } from "../server/services/digilocker-service";

describe("digilocker production policy", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalClientId = process.env.DIGILOCKER_CLIENT_ID;
  const originalClientSecret = process.env.DIGILOCKER_CLIENT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalClientId === undefined) delete process.env.DIGILOCKER_CLIENT_ID;
    else process.env.DIGILOCKER_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined)
      delete process.env.DIGILOCKER_CLIENT_SECRET;
    else process.env.DIGILOCKER_CLIENT_SECRET = originalClientSecret;
  });

  it("throws at startup in production when DigiLocker credentials are missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.DIGILOCKER_CLIENT_ID;
    delete process.env.DIGILOCKER_CLIENT_SECRET;

    expect(() => new DigiLockerService()).toThrow(
      "Missing DIGILOCKER_CLIENT_ID / DIGILOCKER_CLIENT_SECRET in production",
    );
  });
});
