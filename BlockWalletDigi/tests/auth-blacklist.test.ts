import { describe, it, expect } from 'vitest';
import { generateAccessToken, invalidateAccessToken, verifyAccessToken } from '../server/services/auth-service';

describe('Auth Blacklist Security', () => {
    it('should not be cleared by spamming invalid tokens', () => {
        // 1. Generate a valid token
        const user = { id: 1, username: 'victim', role: 'holder' as const };
        const validToken = generateAccessToken(user);

        // 2. Invalidate it (simulating logout)
        invalidateAccessToken(validToken);

        // 3. Verify it's invalid
        expect(verifyAccessToken(validToken)).toBeNull();

        // 4. Attempt to fill the blacklist with garbage
        // This should be ignored by the new implementation
        for (let i = 0; i < 10005; i++) {
            invalidateAccessToken(`dummy-token-${i}`);
        }

        // 5. Check if the original token is still invalid
        const result = verifyAccessToken(validToken);

        // Assert that the fix works (token remains invalid)
        expect(result).toBeNull();
    });
});
