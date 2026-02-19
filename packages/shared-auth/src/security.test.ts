import { describe, it, expect } from "bun:test";
import express from "express";
import request from "supertest";
import { setupSecurity } from "./security";

describe("setupSecurity CORS", () => {
    it("should not reflect arbitrary origin when no config is provided", async () => {
        const app = express();
        setupSecurity(app);

        app.get("/", (req, res) => res.send("ok"));

        const origin = "http://evil.com";
        const response = await request(app)
            .get("/")
            .set("Origin", origin);

        // Vulnerable behavior: Access-Control-Allow-Origin is equal to origin because of `|| true`
        // We assert secure behavior here, so this test should FAIL currently.
        expect(response.headers["access-control-allow-origin"]).not.toBe(origin);
    });

    it("should reflect allowed origin when config is provided", async () => {
        const app = express();
        const allowedOrigin = "http://good.com";
        setupSecurity(app, { allowedOrigins: [allowedOrigin] });

        app.get("/", (req, res) => res.send("ok"));

        const response = await request(app)
            .get("/")
            .set("Origin", allowedOrigin);

        expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    });

    it("should not reflect disallowed origin even if config is provided", async () => {
        const app = express();
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
        // Need to set env var before setupSecurity is called inside the app
        // But setupSecurity reads process.env.ALLOWED_ORIGINS immediately
        process.env.ALLOWED_ORIGINS = allowedOrigin;

        const app = express();
        setupSecurity(app);

        app.get("/", (req, res) => res.send("ok"));

        const response = await request(app)
            .get("/")
            .set("Origin", allowedOrigin);

        expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);

        // Clean up environment
        delete process.env.ALLOWED_ORIGINS;
    });
});
