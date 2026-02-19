import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../server/auth';

describe('requireAuth middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            isAuthenticated: vi.fn().mockReturnValue(false),
            headers: {},
        } as any;
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;
        next = vi.fn();
    });

    it('should call next() if req.isAuthenticated() is true', () => {
        (req.isAuthenticated as any).mockReturnValue(true);
        requireAuth(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() if req.tenantId is present (API Key context)', () => {
        (req as any).tenantId = 'some-tenant-id';
        requireAuth(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() if req.user is present (JWT context)', () => {
        (req as any).user = { id: 'some-user-id' };
        requireAuth(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated via session, API key, or JWT', () => {
        requireAuth(req as Request, res as Response, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized", code: "AUTH_UNAUTHORIZED" });
    });
});
