import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../server/auth';
import { Request, Response, NextFunction } from 'express';

describe('requireAuth Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            isAuthenticated: vi.fn().mockReturnValue(false),
            headers: {},
        } as Partial<Request>;

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as Partial<Response>;

        next = vi.fn();
    });

    it('should call next() if req.isAuthenticated() returns true', () => {
        (req.isAuthenticated as any).mockReturnValue(true);
        requireAuth(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() if req.tenantId is present (API Key fallback)', () => {
        (req as any).tenantId = 'some-tenant';
        requireAuth(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() if req.user is present (JWT fallback)', () => {
        (req as any).user = { id: 'some-user' };
        requireAuth(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated via session, tenantId, or user', () => {
        requireAuth(req as Request, res as Response, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }));
    });
});
