
import { strict as assert } from 'assert';
import { initAuth, getAuthConfig } from './jwt.js'; // Use .js extension for ESM if needed, or rely on bun/ts-node resolution

// Simple test runner
async function runTests() {
    console.log('Running JWT Auth Security Tests...');

    const ORIGINAL_ENV = process.env;
    let passed = 0;
    let failed = 0;

    async function test(name: string, fn: () => void | Promise<void>) {
        try {
            // Setup
            process.env = { ...ORIGINAL_ENV };

            await fn();
            console.log(`✅ PASS: ${name}`);
            passed++;
        } catch (e: any) {
            console.error(`❌ FAIL: ${name}`);
            console.error(e);
            failed++;
        } finally {
            // Teardown
            process.env = ORIGINAL_ENV;
        }
    }

    await test('should match expected initial state (empty or env provided)', () => {
        // We can't easily test "initial state" because module is cached.
        // But we can test that manually resetting to empty works.
        process.env.NODE_ENV = 'development';
        initAuth({ jwtSecret: '', jwtRefreshSecret: '' });

        const config = getAuthConfig();
        // In development, initAuth should have set the weak secret!
        assert.equal(config.jwtSecret, 'dev-only-secret-not-for-production');
    });

    await test('should throw error in production if secrets are missing', () => {
        process.env.NODE_ENV = 'production';

        // Reset to empty first (we need to be careful not to throw during reset)
        // initAuth checks NODE_ENV. So we must set to dev first to reset, then switch to prod.
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        initAuth({ jwtSecret: '', jwtRefreshSecret: '' });
        process.env.NODE_ENV = 'production';

        assert.throws(() => {
            initAuth({});
        }, /SECURITY CRITICAL/);
    });

    await test('should use weak secret with warning in development if secrets are missing', () => {
        process.env.NODE_ENV = 'development';
        initAuth({ jwtSecret: '', jwtRefreshSecret: '' }); // This actually triggers the logic too!

        // But let's verify calling initAuth({}) works
        initAuth({});

        const config = getAuthConfig();
        assert.equal(config.jwtSecret, 'dev-only-secret-not-for-production');
        assert.equal(config.jwtRefreshSecret, 'dev-only-refresh-secret-not-for-production');
    });

    await test('should respect provided secrets in development', () => {
        process.env.NODE_ENV = 'development';

        initAuth({ jwtSecret: 'my-custom-dev-secret', jwtRefreshSecret: 'my-custom-refresh' });

        const config = getAuthConfig();
        assert.equal(config.jwtSecret, 'my-custom-dev-secret');
        assert.equal(config.jwtRefreshSecret, 'my-custom-refresh');
    });

    await test('should respect provided secrets in production', () => {
        process.env.NODE_ENV = 'production';
        const strongSecret = 'strong-production-secret-1234567890';
        initAuth({ jwtSecret: strongSecret, jwtRefreshSecret: strongSecret });

        const config = getAuthConfig();
        assert.equal(config.jwtSecret, strongSecret);
    });

    console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
