import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import BeansPage from './page'
import { BeansModel } from '../../lib/generated-models/Beans'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

// Mock the BeansModel
vi.mock('../../lib/generated-models/Beans', () => ({
  BeansModel: {
    findAll: vi.fn(),
  },
}))

const mockBeans = [
  { id: 1, name: 'Ethiopian Yirgacheffe', roster: 'Blue Bottle', rostery: 'Blue Bottle', origin: 'Ethiopia', roast_level: 'Light', created_at: new Date() },
  { id: 2, name: 'Brazilian Santos', roster: 'Counter Culture', rostery: 'Counter Culture', origin: 'Brazil', roast_level: 'Medium', created_at: new Date() },
]

describe('BeansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and displays beans from database', async () => {
    vi.mocked(BeansModel.findAll).mockResolvedValue(mockBeans)
    
    const page = await BeansPage()
    render(page)
    
    expect(BeansModel.findAll).toHaveBeenCalled()
    expect(screen.getByText('Ethiopian Yirgacheffe')).toBeInTheDocument()
    expect(screen.getByText('Brazilian Santos')).toBeInTheDocument()
  })

  it('shows add bean button in header', async () => {
    vi.mocked(BeansModel.findAll).mockResolvedValue([])
    
    const page = await BeansPage()
    render(page)
    
    const addButtons = screen.getAllByText(/add bean/i)
    expect(addButtons.length).toBeGreaterThan(0)
    expect(addButtons[0].closest('a')).toHaveAttribute('href', '/manage/beans/new')
  })

  it('shows empty state when no beans', async () => {
    vi.mocked(BeansModel.findAll).mockResolvedValue([])
    
    const page = await BeansPage()
    render(page)
    
    expect(screen.getByText(/no coffee beans yet/i)).toBeInTheDocument()
  })

  it('navigates to add bean form when button clicked', async () => {
    vi.mocked(BeansModel.findAll).mockResolvedValue([])
    
    const page = await BeansPage()
    render(page)
    
    const addButtons = screen.getAllByText(/add bean/i)
    expect(addButtons[0].closest('a')).toHaveAttribute('href', '/manage/beans/new')
  })
})
