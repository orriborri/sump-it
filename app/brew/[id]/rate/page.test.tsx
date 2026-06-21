import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock the actions module before importing the page
vi.mock('../actions', () => ({
  getBrewDetails: vi.fn().mockResolvedValue({
    id: 1,
    bean_name: 'Ethiopian Yirgacheffe',
    method_name: 'V60',
    grinder_name: 'Comandante',
    dose: 15,
    water: 250,
    ratio: 16.67,
    grind: 20,
  }),
}))

vi.mock('../../feedback/actions', () => ({
  saveBrewFeedback: vi.fn().mockResolvedValue({ success: true }),
}))

import RatePage from './page'

describe('Rate Page', () => {
  it('renders shareable brew rating page', async () => {
    const page = await RatePage({ params: Promise.resolve({ id: '1' }) })
    render(page)

    expect(screen.getByText(/Ethiopian Yirgacheffe/)).toBeInTheDocument()
  })

  it('shows feedback form with rating', async () => {
    const page = await RatePage({ params: Promise.resolve({ id: '1' }) })
    render(page)

    expect(screen.getByText(/how was this brew/i)).toBeInTheDocument()
    expect(screen.getByText(/overall rating/i)).toBeInTheDocument()
  })
})
