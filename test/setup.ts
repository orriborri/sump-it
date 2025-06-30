import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { createTestDatabase, setupTestDatabase, cleanupTestDatabase } from './database-setup'

// Global test database instance
let testDb: any

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
  if (testDb) {
    await cleanupTestDatabase(testDb)
  }
})
