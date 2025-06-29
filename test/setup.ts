import '@testing-library/jest-dom'
import { vi } from 'vitest'

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

// Mock server actions
vi.mock('../app/brew/workflow/actions', () => ({
  saveBrew: vi.fn(),
  getPreviousBrews: vi.fn(),
}))

// Mock database
vi.mock('../app/lib/database', () => ({
  db: {},
}))
