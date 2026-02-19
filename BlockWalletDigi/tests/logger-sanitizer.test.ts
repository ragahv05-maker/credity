import { describe, it, expect } from 'vitest';
import { sanitizeForLogging } from '../server/utils/logger-sanitizer';

describe('logger-sanitizer', () => {
  it('should redact sensitive keys', () => {
    const input = {
      password: 'mySecretPassword',
      token: 'someToken123',
      user: {
        email: 'test@example.com',
        phoneNumber: '1234567890',
        metadata: {
          apiKey: 'secretKey',
        },
      },
    };

    const sanitized = sanitizeForLogging(input) as any;

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.user.email).toBe('[REDACTED]');
    expect(sanitized.user.phoneNumber).toBe('[REDACTED]');
    expect(sanitized.user.metadata.apiKey).toBe('[REDACTED]');
  });

  it('should not redact non-sensitive keys', () => {
    const input = {
      username: 'johndoe',
      id: 123,
      isActive: true,
      preferences: {
        theme: 'dark',
      },
      keyboard: 'US', // 'key' was too broad, checking if fixed
    };

    const sanitized = sanitizeForLogging(input) as any;

    expect(sanitized).toEqual(input);
    expect(sanitized.keyboard).toBe('US');
  });

  it('should truncate long strings', () => {
    const longString = 'a'.repeat(600);
    const input = {
      description: longString,
    };

    const sanitized = sanitizeForLogging(input) as any;

    expect(sanitized.description).toHaveLength(501); // 500 + '…'
    expect(sanitized.description.endsWith('…')).toBe(true);
  });

  it('should truncate long arrays', () => {
    const longArray = Array.from({ length: 30 }, (_, i) => i);
    const input = {
      items: longArray,
    };

    const sanitized = sanitizeForLogging(input) as any;

    expect(sanitized.items).toHaveLength(20);
    expect(sanitized.items[0]).toBe(0);
    expect(sanitized.items[19]).toBe(19);
  });

  it('should handle depth limit', () => {
    const deepObject = {
      l1: {
        l2: {
          l3: {
            l4: {
              l5: {
                l6: {
                  l7: {
                    l8: 'too deep',
                  },
                },
              },
            },
          },
        },
      },
    };

    const sanitized = sanitizeForLogging(deepObject) as any;

    expect(sanitized.l1.l2.l3.l4.l5.l6.l7).toBe('[TRUNCATED]');
  });

  it('should handle primitives and null/undefined', () => {
    expect(sanitizeForLogging(null)).toBe(null);
    expect(sanitizeForLogging(undefined)).toBe(undefined);
    expect(sanitizeForLogging(123)).toBe(123);
    expect(sanitizeForLogging(true)).toBe(true);
    expect(sanitizeForLogging('short string')).toBe('short string');
  });

  it('should handle Dates', () => {
    const date = new Date('2023-01-01T00:00:00.000Z');
    const input = {
      createdAt: date,
    };

    const sanitized = sanitizeForLogging(input) as any;

    expect(sanitized.createdAt).toBe(date.toISOString());
  });

  it('should handle mixed content', () => {
    const input = {
      users: [
        { id: 1, password: 'pw1' },
        { id: 2, password: 'pw2' },
      ],
      config: {
        secretToken: 'shhh',
        timeout: 5000,
      },
    };

    const sanitized = sanitizeForLogging(input) as any;

    expect(sanitized.users[0].password).toBe('[REDACTED]');
    expect(sanitized.users[0].id).toBe(1);
    expect(sanitized.config.secretToken).toBe('[REDACTED]');
    expect(sanitized.config.timeout).toBe(5000);
  });
});
