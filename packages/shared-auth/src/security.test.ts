import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express, { type Application } from "express";
import request from "supertest";
import { setupSecurity } from "./security";

describe("setupSecurity CORS", () => {
    let app: Application;

    beforeEach(() => {
        app = express();
    });

    afterEach(() => {
        delete process.env.ALLOWED_ORIGINS;
    });

    it("should not reflect arbitrary origin when no config is provided", async () => {
        setupSecurity(app);

        app.get("/", (req, res) => res.send("ok"));

        const origin = "http://evil.com";
        const response = await request(app)
            .get("/")
            .set("Origin", origin);

        // Secure behavior: origin should not be reflected
        expect(response.headers["access-control-allow-origin"]).not.toBe(origin);
    });

    it("should reflect allowed origin when config is provided", async () => {
        const allowedOrigin = "http://good.com";
        setupSecurity(app, { allowedOrigins: [allowedOrigin] });

        app.get("/", (req, res) => res.send("ok"));

        const response = await request(app)
            .get("/")
            .set("Origin", allowedOrigin);

        expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    });

    it("should not reflect disallowed origin even if config is provided", async () => {
        const allowedOrigin = "http://good.com";
        setupSecurity(app, { allowedOrigins: [allowedOrigin] });

        app.get("/", (req, res) => res.send("ok"));

        const evilOrigin = "http://evil.com";
        const response = await request(app)
            .get("/")
            .set("Origin", evilOrigin);

        expect(response.headers["access-control-allow-origin"]).not.toBe(evilOrigin);
    });

    it("should respect allowed origin from environment variable", async () => {
        const allowedOrigin = "http://env-allowed.com";
        process.env.ALLOWED_ORIGINS = allowedOrigin;

        setupSecurity(app);

        app.get("/", (req, res) => res.send("ok"));

        const response = await request(app)
            .get("/")
            .set("Origin", allowedOrigin);

        expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    });
});
