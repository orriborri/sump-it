import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    // Include integration tests in addition to regular test files
    include: ['**/*.{test,spec,integration}.?(c|m)[jt]s?(x)'],
    // Increase timeout for database operations
    testTimeout: 10000,
    // Run tests serially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
})
