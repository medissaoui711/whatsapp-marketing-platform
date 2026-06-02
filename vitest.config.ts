import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: '.',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.next'],
    setupFiles: ['tests/setup/env.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/cache/src/**/*.ts',
        'packages/db/src/**/*.ts',
        'apps/web/app/api/**/route.ts',
      ],
      exclude: ['node_modules', 'dist', '.next'],
    },
  },
});
