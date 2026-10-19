// Vitest setup: extends `expect` with jest-dom matchers for DOM assertions and
// unmounts any React tree rendered by Testing Library after each test so the
// jsdom document is clean between tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
