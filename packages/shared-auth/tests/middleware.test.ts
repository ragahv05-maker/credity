import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { authMiddleware } from '../src/middleware';
import { generateAccessToken, invalidateAccessToken, initAuth } from '../src/jwt';

describe('Auth Middleware Security', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        initAuth({
            jwtSecret: 'test-secret',
            revocationStore: undefined // Reset store
        });
    });

    it('should allow request with valid token', async () => {
        const token = generateAccessToken({ id: 1, username: 'test', role: 'user' });
        const req = {
            headers: { authorization: `Bearer ${token}` }
        } as unknown as Request;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        } as unknown as Response;
        const next = vi.fn();

        await authMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
    });

    it('should block request with revoked token', async () => {
        const token = generateAccessToken({ id: 1, username: 'test', role: 'user' });
        await invalidateAccessToken(token);

        const req = {
            headers: { authorization: `Bearer ${token}` }
        } as unknown as Request;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        } as unknown as Response;
        const next = vi.fn();

        await authMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid or expired/) }));
    });
});
