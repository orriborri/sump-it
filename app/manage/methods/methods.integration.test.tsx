import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MethodsPageClient } from './MethodsPageClient'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/manage/methods',
}))

// Mock the addMethod action
vi.mock('../actions', () => ({
  addMethod: vi.fn().mockResolvedValue({ id: 1, name: 'V60 Pour Over' }),
}))

const mockMethods = [
  { id: 1, name: 'V60' },
  { id: 2, name: 'French Press' },
]

describe('Methods Integration Tests', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it('displays methods list with add button', async () => {
    render(<MethodsPageClient methods={mockMethods} />)
    
    expect(screen.getByText('☕ Your Brew Methods')).toBeInTheDocument()
    expect(screen.getByText('Add Method')).toBeInTheDocument()
  })

  it('opens add method modal when add button is clicked', async () => {
    const user = userEvent.setup()
    render(<MethodsPageClient methods={mockMethods} />)
    
    const addButton = screen.getByText('Add Method')
    await user.click(addButton)
    
    expect(screen.getByText('Add New Brew Method')).toBeInTheDocument()
    expect(screen.getByLabelText('Method Name')).toBeInTheDocument()
  })

  it('saves new method when form is submitted', async () => {
    const user = userEvent.setup()
    render(<MethodsPageClient methods={mockMethods} />)
    
    // Open modal
    await user.click(screen.getByText('Add Method'))
    
    // Fill form
    const nameInput = screen.getByLabelText('Method Name')
    await user.type(nameInput, 'V60 Pour Over')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /adding method|add method/i })
    await user.click(submitButton)
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/method added successfully/i)).toBeInTheDocument()
    })
  })
})
