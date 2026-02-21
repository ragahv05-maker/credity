import { describe, it, expect, vi } from 'vitest';
import { deviceFingerprintMiddleware } from '../server/middleware/device-fingerprint';
import { Request, Response } from 'express';

describe('Device Fingerprint Middleware', () => {
    it('should ignore client-supplied x-device-fingerprint header', () => {
        const req = {
            headers: {
                'x-device-fingerprint': 'spoofed-fingerprint',
                'user-agent': 'test-agent',
                'x-forwarded-for': '127.0.0.1'
            },
            socket: { remoteAddress: '127.0.0.1' }
        } as unknown as Request;
        const res = {} as Response;
        const next = vi.fn();

        deviceFingerprintMiddleware(req, res, next);

        expect(req.deviceFingerprint).toBeDefined();
        expect(req.deviceFingerprint).not.toBe('spoofed-fingerprint');
        expect(next).toHaveBeenCalled();
    });

    it('should generate consistent fingerprint for same inputs', () => {
        const req1 = {
            headers: { 'user-agent': 'ua1', 'x-forwarded-for': '1.2.3.4' },
            socket: {}
        } as unknown as Request;

        const req2 = {
            headers: { 'user-agent': 'ua1', 'x-forwarded-for': '1.2.3.4' },
            socket: {}
        } as unknown as Request;

        const next = vi.fn();
        deviceFingerprintMiddleware(req1, {} as Response, next);
        deviceFingerprintMiddleware(req2, {} as Response, next);

        expect(req1.deviceFingerprint).toBe(req2.deviceFingerprint);
    });

    it('should use x-forwarded-for if present', () => {
         const req = {
            headers: {
                'user-agent': 'test-agent',
                'x-forwarded-for': '10.0.0.1, 192.168.1.1'
            },
            socket: { remoteAddress: '127.0.0.1' }
        } as unknown as Request;
        const next = vi.fn();

        deviceFingerprintMiddleware(req, {} as Response, next);

        // We can't easily predict the hash, but we can verify consistency
        const fp1 = req.deviceFingerprint;

        // Same IP should give same hash
        const req2 = { ...req, headers: { ...req.headers } } as unknown as Request;
        deviceFingerprintMiddleware(req2, {} as Response, next);
        expect(req2.deviceFingerprint).toBe(fp1);

        // Different IP should give different hash
        const req3 = { ...req, headers: { ...req.headers, 'x-forwarded-for': '10.0.0.2' } } as unknown as Request;
        deviceFingerprintMiddleware(req3, {} as Response, next);
        expect(req3.deviceFingerprint).not.toBe(fp1);
    });
});
