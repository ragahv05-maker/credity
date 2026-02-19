import { describe, it, expect } from 'vitest';
import { sanitizeContext } from '../server/middleware/observability';

describe('sanitizeContext', () => {
    it('should redact sensitive keywords', () => {
        const input = {
            password: 'supersecretpassword',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            apiKey: '12345',
            authorization: 'Bearer token',
            cookie: 'session=123',
            email: 'test@example.com',
            phone: '+1234567890'
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual({
            password: '[REDACTED]',
            token: '[REDACTED]',
            apiKey: '[REDACTED]', // "key" is in sensitive list, so "apiKey" is redacted
            authorization: '[REDACTED]',
            cookie: '[REDACTED]',
            email: '[REDACTED]',
            phone: '[REDACTED]'
        });
    });

    it('should handle partial matches for sensitive keywords', () => {
        // The implementation uses `key.toLowerCase().includes(value)`
        // SENSITIVE_KEYWORDS = ['password', 'token', 'authorization', 'cookie', 'secret', 'key', 'otp', 'email', 'phone']

        const input = {
            mySecretValue: 'hidden',
            accessKeyId: 'AKIA...',
            userPasswordHash: 'hash',
            otpCode: '123456'
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual({
            mySecretValue: '[REDACTED]', // contains "secret"
            accessKeyId: '[REDACTED]',   // contains "key"
            userPasswordHash: '[REDACTED]', // contains "password"
            otpCode: '[REDACTED]'        // contains "otp"
        });
    });

    it('should redact entire object if key matches sensitive keyword', () => {
        const input = {
            user: {
                name: 'Alice',
                secrets: {
                    password: '123'
                }
            }
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual({
            user: {
                name: 'Alice',
                secrets: '[REDACTED]' // "secrets" contains "secret", so the whole object is redacted
            }
        });
    });

    it('should recursively sanitize nested objects when key is not sensitive', () => {
         const input = {
            user: {
                name: 'Alice',
                profile: {
                    password: '123'
                }
            }
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual({
            user: {
                name: 'Alice',
                profile: {
                    password: '[REDACTED]'
                }
            }
        });
    })

    it('should sanitize arrays of objects', () => {
        const input = {
            users: [
                { name: 'Bob', token: 'abc' },
                { name: 'Charlie', token: 'def' }
            ]
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual({
            users: [
                { name: 'Bob', token: '[REDACTED]' },
                { name: 'Charlie', token: '[REDACTED]' }
            ]
        });
    });

    it('should handle non-sensitive data correctly', () => {
        const input = {
            status: 'ok',
            count: 42,
            isActive: true,
            data: {
                id: 1,
                title: 'Hello'
            }
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual(input);
    });

    it('should truncate deep objects', () => {
        // depth > 4 returns '[TRUNCATED]'
        const input = {
            a: {
                b: {
                    c: {
                        d: {
                            e: {
                                f: 'too deep'
                            }
                        }
                    }
                }
            }
        };

        const sanitized = sanitizeContext(input);

        expect(sanitized).toEqual({
            a: {
                b: {
                    c: {
                        d: {
                            e: '[TRUNCATED]'
                        }
                    }
                }
            }
        });
    });

    it('should truncate long strings', () => {
        const longString = 'a'.repeat(305);
        const input = { description: longString };

        const sanitized = sanitizeContext(input) as any;

        expect(sanitized.description).toContain('…');
        // truncated to 300 + 1 char ellipsis = 301
        expect(sanitized.description.length).toBe(301);
        expect(sanitized.description.length).toBeLessThan(longString.length);
    });
});
