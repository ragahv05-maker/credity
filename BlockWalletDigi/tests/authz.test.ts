import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { getAuthenticatedUserId } from '../server/utils/authz';

describe('getAuthenticatedUserId', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            status: statusMock,
        } as unknown as Response;

        mockReq = {
            user: undefined
        };
    });

    it('should return userId when it is a valid positive integer', () => {
        mockReq.user = { userId: 123 } as any;

        const result = getAuthenticatedUserId(mockReq as Request, mockRes as Response);

        expect(result).toBe(123);
        expect(statusMock).not.toHaveBeenCalled();
        expect(jsonMock).not.toHaveBeenCalled();
    });

    it('should return null and send 401 when req.user is undefined', () => {
        mockReq.user = undefined;

        const result = getAuthenticatedUserId(mockReq as Request, mockRes as Response);

        expect(result).toBeNull();
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    });

    it('should return null and send 401 when userId is not a number', () => {
        mockReq.user = { userId: 'abc' } as any;

        const result = getAuthenticatedUserId(mockReq as Request, mockRes as Response);

        expect(result).toBeNull();
        expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return null and send 401 when userId is zero', () => {
        mockReq.user = { userId: 0 } as any;

        const result = getAuthenticatedUserId(mockReq as Request, mockRes as Response);

        expect(result).toBeNull();
        expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return null and send 401 when userId is negative', () => {
        mockReq.user = { userId: -5 } as any;

        const result = getAuthenticatedUserId(mockReq as Request, mockRes as Response);

        expect(result).toBeNull();
        expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should return null and send 401 when userId is a float', () => {
        mockReq.user = { userId: 1.5 } as any;

        const result = getAuthenticatedUserId(mockReq as Request, mockRes as Response);

        expect(result).toBeNull();
        expect(statusMock).toHaveBeenCalledWith(401);
    });
});
