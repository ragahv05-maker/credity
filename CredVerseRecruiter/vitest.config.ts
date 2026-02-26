import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['tests/e2e/**'],
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup-env.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@credverse/shared-auth': path.resolve(import.meta.dirname, '../packages/shared-auth/src/index.ts'),
      '@credverse/trust': path.resolve(import.meta.dirname, '../packages/trust-sdk/src/index.ts'),
    },
  },
});
