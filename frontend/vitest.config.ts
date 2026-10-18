import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the `@/*` path alias from tsconfig.json so tests import the same
      // way application code does.
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Enforce full coverage of every lines/branches/functions/statements
      // metric. The harness is green from day one and stays that way.
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      // Measure every file matched by `include`, even ones no test touched, so
      // dead/untested code fails the gate instead of silently passing.
      all: true,
      // `include` is the allow-list of application code under the coverage
      // gate. It grows as later tickets add tested modules (handlers, hooks,
      // components). Keeping it explicit means a new file is never silently
      // left uncovered: it either gets tests or is added here deliberately.
      include: ['lib/format.ts'],
      // The ONLY config-level (path-based) exclusion: ts-rs generated types.
      // These are produced by the backend build (`cargo test export_bindings`)
      // and must never be edited or tested by hand. Everything else is covered
      // inline with `/* v8 ignore */` plus a `coverage:` reason (see
      // docs/coverage.md).
      exclude: ['lib/generated/**'],
    },
  },
});
