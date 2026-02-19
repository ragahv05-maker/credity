import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    initAuth,
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    verifyToken,
    refreshAccessToken,
    getAuthConfig
} from '../src/jwt';
import type { AuthUser } from '../src/types';

describe('JWT Utilities', () => {
    const defaultUser: AuthUser = {
        id: '123',
        username: 'testuser',
        role: 'user',
        app: 'wallet'
    };

    const defaultConfig = {
        jwtSecret: 'dev-only-secret-not-for-production',
        jwtRefreshSecret: 'dev-only-refresh-secret-not-for-production',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        app: 'unknown',
    };

    beforeEach(() => {
        vi.unstubAllEnvs();
        // Reset config to defaults before each test
        initAuth(defaultConfig);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe('Token Generation', () => {
        it('should generate a valid access token', () => {
            const token = generateAccessToken(defaultUser);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            const decoded = verifyAccessToken(token);
            expect(decoded).toBeDefined();
            expect(decoded?.userId).toBe(defaultUser.id);
            expect(decoded?.username).toBe(defaultUser.username);
            expect(decoded?.role).toBe(defaultUser.role);
            expect(decoded?.type).toBe('access');
        });

        it('should generate a valid refresh token', () => {
            const token = generateRefreshToken(defaultUser);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            const decoded = verifyRefreshToken(token);
            expect(decoded).toBeDefined();
            expect(decoded?.userId).toBe(defaultUser.id);
            expect(decoded?.type).toBe('refresh');
        });

        it('should generate a token pair', () => {
            const pair = generateTokenPair(defaultUser);
            expect(pair.accessToken).toBeDefined();
            expect(pair.refreshToken).toBeDefined();
            expect(pair.expiresIn).toBe(900); // 15 minutes in seconds

            const accessDecoded = verifyAccessToken(pair.accessToken);
            expect(accessDecoded?.type).toBe('access');

            const refreshDecoded = verifyRefreshToken(pair.refreshToken);
            expect(refreshDecoded?.type).toBe('refresh');
        });
    });

    describe('Token Verification', () => {
        it('should verify a valid access token', () => {
            const token = generateAccessToken(defaultUser);
            const decoded = verifyAccessToken(token);
            expect(decoded).not.toBeNull();
        });

        it('should verify a valid refresh token', () => {
            const token = generateRefreshToken(defaultUser);
            const decoded = verifyRefreshToken(token);
            expect(decoded).not.toBeNull();
        });

        it('should return null for invalid access token', () => {
            const decoded = verifyAccessToken('invalid.token.string');
            expect(decoded).toBeNull();
        });

        it('should return null for invalid refresh token', () => {
            const decoded = verifyRefreshToken('invalid.token.string');
            expect(decoded).toBeNull();
        });

        it('should reject access token verification with refresh token', () => {
            const refreshToken = generateRefreshToken(defaultUser);
            const decoded = verifyAccessToken(refreshToken);
            expect(decoded).toBeNull();
        });

        it('should reject refresh token verification with access token', () => {
            const accessToken = generateAccessToken(defaultUser);
            const decoded = verifyRefreshToken(accessToken);
            expect(decoded).toBeNull();
        });

        it('should verifyToken and return structured result', () => {
            const token = generateAccessToken(defaultUser);
            const result = verifyToken(token);

            expect(result.valid).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user?.userId).toBe(defaultUser.id);
            expect(result.app).toBe(defaultConfig.app);
        });

        it('should return invalid result for verifyToken with bad token', () => {
            const result = verifyToken('bad-token');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Token Refresh', () => {
        it('should refresh access token with valid refresh token', () => {
            const refreshToken = generateRefreshToken(defaultUser);
            const newPair = refreshAccessToken(refreshToken);

            expect(newPair).not.toBeNull();
            expect(newPair?.accessToken).toBeDefined();
            expect(newPair?.refreshToken).toBeDefined();

            // Verify the new tokens
            expect(verifyAccessToken(newPair!.accessToken)).not.toBeNull();
            expect(verifyRefreshToken(newPair!.refreshToken)).not.toBeNull();
        });

        it('should return null when refreshing with invalid token', () => {
            const result = refreshAccessToken('invalid-refresh-token');
            expect(result).toBeNull();
        });

        it('should return null when refreshing with access token', () => {
            const accessToken = generateAccessToken(defaultUser);
            const result = refreshAccessToken(accessToken);
            expect(result).toBeNull();
        });
    });

    describe('Configuration & Security', () => {
        it('should update configuration via initAuth', () => {
            initAuth({ app: 'test-app', accessTokenExpiry: '1h' });
            const config = getAuthConfig();
            expect(config.app).toBe('test-app');
            expect(config.accessTokenExpiry).toBe('1h');

            // Verify generated token reflects new config
            const token = generateAccessToken(defaultUser);
            const decoded = verifyAccessToken(token);
            expect(decoded?.app).toBe('test-app');
        });

        it('should throw error in production if secrets are weak (jwtSecret)', () => {
            vi.stubEnv('NODE_ENV', 'production');

            expect(() => {
                initAuth({ jwtSecret: 'dev-only-secret-not-for-production' });
            }).toThrow(/SECURITY CRITICAL/);
        });

        it('should throw error in production if secrets are weak (jwtRefreshSecret)', () => {
            vi.stubEnv('NODE_ENV', 'production');

            expect(() => {
                initAuth({
                    jwtSecret: 'strong-secret',
                    jwtRefreshSecret: 'dev-only-refresh-secret-not-for-production'
                });
            }).toThrow(/SECURITY CRITICAL/);
        });

        it('should NOT throw error in production if secrets are strong', () => {
            vi.stubEnv('NODE_ENV', 'production');

            expect(() => {
                initAuth({
                    jwtSecret: 'strong-secret-123',
                    jwtRefreshSecret: 'strong-refresh-secret-123'
                });
            }).not.toThrow();
        });

        it('should warn in development if secrets are weak (console spy)', () => {
            const consoleSpy = vi.spyOn(console, 'warn');
            vi.stubEnv('NODE_ENV', 'development');

            initAuth({ jwtSecret: '' }); // or keeping default

            // Re-init with empty to trigger check if applicable,
            // but the code checks !authConfig.jwtSecret in else block
            initAuth({});

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING: Using development JWT secrets'));
        });
    });
});
