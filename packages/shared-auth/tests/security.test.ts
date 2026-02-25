import { describe, it, expect, vi } from "vitest";
import { suspiciousRequestDetector } from "../src/security";
import { Request, Response, NextFunction } from "express";

describe("suspiciousRequestDetector", () => {
  const mockReq = (body: any) =>
    ({
      body,
      query: {},
      params: {},
      path: "/test",
      ip: "127.0.0.1",
    }) as unknown as Request;

  const mockRes = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn();
    return res;
  };

  it("should block requests with SQL injection comments (--)", () => {
    const req = mockReq({ query: "SELECT * FROM users -- " });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    suspiciousRequestDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request blocked by security filter",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should block requests with SQL injection comments at end of line (--)", () => {
    const req = mockReq({ query: "SELECT * FROM users --" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    suspiciousRequestDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow requests with harmless # characters (e.g. hashtags, numbers)", () => {
    const req = mockReq({ description: "Task #1 done" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    suspiciousRequestDetector(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should allow requests with harmless dashes in text (e.g. em-dash)", () => {
    const req = mockReq({ description: "This is a semi-formal event" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    suspiciousRequestDetector(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should allow requests with harmless -- in text if not standalone", () => {
    const req = mockReq({ description: "page--break" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    suspiciousRequestDetector(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should block XSS script tags", () => {
    const req = mockReq({ content: "<script>alert(1)</script>" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    suspiciousRequestDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
