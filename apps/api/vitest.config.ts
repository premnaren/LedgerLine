import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run test suites sequentially to prevent concurrent transaction interference against shared PostgreSQL tables
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
