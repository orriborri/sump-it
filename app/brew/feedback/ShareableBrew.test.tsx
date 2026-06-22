import React from 'react'
import { render, screen } from '@testing-library/react'
import { ShareableBrew } from './ShareableBrew'
import { vi } from 'vitest'

// Mock the actions module
vi.mock('./actions', () => ({
  saveBrewFeedback: vi.fn().mockResolvedValue({ success: true }),
}))

const mockBrewData = {
  id: 1,
  bean_name: 'Ethiopian Yirgacheffe',
  method_name: 'V60',
  grinder_name: 'Comandante',
  dose: 15,
  water: 250,
  ratio: 16.67,
  grind: 20,
}

describe('ShareableBrew Component', () => {
  it('renders brew details', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(
      screen.getByRole('heading', { level: 5, name: /Ethiopian Yirgacheffe/ })
    ).toBeInTheDocument()
    expect(screen.getByText('V60')).toBeInTheDocument()
    expect(screen.getByText('15g')).toBeInTheDocument()
    expect(screen.getByText('250ml')).toBeInTheDocument()
  })

  it('shows copy link button', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(screen.getByText(/copy link/i)).toBeInTheDocument()
  })

  it('shows feedback heading and rating', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(screen.getByText(/how was this brew/i)).toBeInTheDocument()
    expect(screen.getByText(/overall rating/i)).toBeInTheDocument()
  })

  it('shows taste note chips', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(screen.getByText(/taste notes/i)).toBeInTheDocument()
    expect(screen.getByText('Too Weak')).toBeInTheDocument()
    expect(screen.getByText('Too Strong')).toBeInTheDocument()
    expect(screen.getByText('Bitter')).toBeInTheDocument()
    expect(screen.getByText('Sour')).toBeInTheDocument()
  })

  it('shows save button disabled when no rating', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    const saveButton = screen.getByRole('button', { name: /save feedback/i })
    expect(saveButton).toBeDisabled()
  })
})
