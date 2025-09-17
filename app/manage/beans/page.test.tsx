import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import BeansPage from './page'
import { BeansModel } from '../../lib/generated-models/Beans'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {},
}))

// Mock the BeansModel
vi.mock('../../lib/generated-models/Beans', () => ({
  BeansModel: vi.fn().mockImplementation(() => ({
    findAll: vi.fn(),
  })),
}))

const mockBeans = [
  { id: 1, name: 'Ethiopian Yirgacheffe', roster: 'Blue Bottle', rostery: 'Blue Bottle', origin: 'Ethiopia', roast_level: 'Light', created_at: new Date() },
  { id: 2, name: 'Brazilian Santos', roster: 'Counter Culture', rostery: 'Counter Culture', origin: 'Brazil', roast_level: 'Medium', created_at: new Date() },
]

describe('BeansPage', () => {
  let mockFindAll: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindAll = vi.fn()
    vi.mocked(BeansModel).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any)
  })

  it('fetches and displays beans from database', async () => {
    mockFindAll.mockResolvedValue(mockBeans)
    
    const page = await BeansPage()
    render(page)
    
    expect(mockFindAll).toHaveBeenCalled()
    expect(screen.getByText('Ethiopian Yirgacheffe')).toBeInTheDocument()
    expect(screen.getByText('Brazilian Santos')).toBeInTheDocument()
  })

  it('shows add bean button in header', async () => {
    mockFindAll.mockResolvedValue([])
    
    const page = await BeansPage()
    render(page)
    
    const addButtons = screen.getAllByText(/add bean/i)
    expect(addButtons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no beans', async () => {
    mockFindAll.mockResolvedValue([])
    
    const page = await BeansPage()
    render(page)
    
    const emptyStateElements = screen.getAllByText(/no coffee beans yet/i)
    expect(emptyStateElements.length).toBeGreaterThan(0)
  })

  it('shows add bean button when no beans', async () => {
    mockFindAll.mockResolvedValue([])
    
    const page = await BeansPage()
    render(page)
    
    const addButtons = screen.getAllByText(/add bean/i)
    expect(addButtons.length).toBeGreaterThan(0)
  })
})
