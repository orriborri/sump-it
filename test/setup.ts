import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'
import {
  createTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from './database-setup'

// Global test database instance
let testDb: ReturnType<typeof createTestDatabase> | null = null

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/brew',
}))

// Mock database with real test database
vi.mock('../app/lib/database', () => ({
  get db() {
    return testDb
  },
}))

// Setup and teardown for each test
beforeEach(async () => {
  testDb = createTestDatabase()
  await setupTestDatabase(testDb)
})

afterEach(async () => {
  // Explicit cleanup is required here despite @testing-library/react's auto-cleanup.
  // In singleFork mode with async afterEach (database teardown), the auto-cleanup
  // may not execute before the next test renders, causing DOM leakage between tests.
  cleanup()
  if (testDb) {
    await cleanupTestDatabase(testDb)
  }
})
