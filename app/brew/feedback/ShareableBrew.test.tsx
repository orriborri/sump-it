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

    expect(screen.getAllByText(/Ethiopian Yirgacheffe/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('V60').length).toBeGreaterThan(0)
    expect(screen.getAllByText('15g').length).toBeGreaterThan(0)
    expect(screen.getAllByText('250ml').length).toBeGreaterThan(0)
  })

  it('shows copy link button', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(screen.getAllByText(/copy link/i).length).toBeGreaterThan(0)
  })

  it('shows feedback heading and rating', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(screen.getAllByText(/how was this brew/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/overall rating/i).length).toBeGreaterThan(0)
  })

  it('shows taste note chips', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    expect(screen.getAllByText(/taste notes/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Too Weak').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Too Strong').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bitter').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sour').length).toBeGreaterThan(0)
  })

  it('shows save button disabled when no rating', () => {
    render(<ShareableBrew brewData={mockBrewData} />)

    const saveButtons = screen.getAllByRole('button', { name: /save feedback/i })
    expect(saveButtons[0]).toBeDisabled()
  })
})
