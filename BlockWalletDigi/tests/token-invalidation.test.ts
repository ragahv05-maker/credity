import { describe, it, expect, vi } from 'vitest';
import {
    generateAccessToken,
    invalidateAccessToken,
    verifyAccessToken,
    AuthUser
} from '../server/services/auth-service';

// Mock dependencies if needed, but we are testing the service logic directly
// The service uses in-memory storage for invalidated tokens, so it should be testable directly.

describe('Token Invalidation Security', () => {
    it('should maintain invalidation status even after many new invalidations', () => {
        // 1. Create a user and a token
        const user: AuthUser = {
            id: 1,
            username: 'victim',
            role: 'holder'
        };
        const sensitiveToken = generateAccessToken(user);

        // 2. Invalidate the token (e.g. user logout)
        invalidateAccessToken(sensitiveToken);

        // 3. Verify it is invalid
        expect(verifyAccessToken(sensitiveToken)).toBeNull();

        // 4. Attack: Flood the invalidation list
        // The limit is 10000. We add 10001 more tokens.
        for (let i = 0; i < 10001; i++) {
            // We don't even need valid signatures for the invalidation list if the service doesn't check them on invalidation
            // But let's generate valid ones to be sure we hit the code path
            // Actually invalidateAccessToken just takes a string.
            const dummyToken = `dummy-token-${i}`;
            invalidateAccessToken(dummyToken);
        }

        // 5. Check if the original token is still invalid
        // If the list was cleared, verifyAccessToken will return the payload (since signature is valid and time is valid)
        // Note: We need to make sure sensitiveToken hasn't expired yet.
        // generateAccessToken uses 15m expiry. This test runs in milliseconds.

        const verificationResult = verifyAccessToken(sensitiveToken);

        // If the vulnerability exists, verificationResult will be non-null (valid token)
        // If fixed, it should remain null (invalid token)
        expect(verificationResult).toBeNull();
    });
});
