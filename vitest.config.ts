// ABOUTME: Vitest configuration for the Shopify Spinner test suite.
// ABOUTME: Configures test environment, globals, and coverage reporting.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
