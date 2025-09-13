import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareableBrew } from './ShareableBrew'

const mockBrewData = {
  id: 1,
  bean_name: 'Ethiopian Yirgacheffe',
  method_name: 'V60',
  grinder_name: 'Comandante',
  dose: 15,
  water: 250,
  ratio: 16.67,
  grind: 20
}

describe('ShareableBrew Component', () => {
  it('renders brew details', () => {
    render(<ShareableBrew brewData={mockBrewData} />)
    
    expect(screen.getByText('Ethiopian Yirgacheffe')).toBeInTheDocument()
    expect(screen.getByText('V60')).toBeInTheDocument()
    expect(screen.getByText('15g')).toBeInTheDocument()
    expect(screen.getByText('250ml')).toBeInTheDocument()
  })

  it('shows share button', () => {
    render(<ShareableBrew brewData={mockBrewData} />)
    
    expect(screen.getByText(/share brew/i)).toBeInTheDocument()
  })

  it('generates shareable URL when share clicked', () => {
    render(<ShareableBrew brewData={mockBrewData} />)
    
    const shareButton = screen.getByText(/share brew/i)
    fireEvent.click(shareButton)
    
    expect(screen.getByText(/brew\/1\/rate/)).toBeInTheDocument()
  })

  it('shows rating form for collaborative feedback', () => {
    render(<ShareableBrew brewData={mockBrewData} />)
    
    expect(screen.getByText(/rate this brew/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/overall rating/i)).toBeInTheDocument()
  })

  it('shows advanced feedback toggle', () => {
    render(<ShareableBrew brewData={mockBrewData} />)
    
    expect(screen.getByText(/advanced feedback/i)).toBeInTheDocument()
  })

  it('shows suggestions when advanced feedback enabled', () => {
    render(<ShareableBrew brewData={mockBrewData} />)
    
    const advancedToggle = screen.getByText(/advanced feedback/i)
    fireEvent.click(advancedToggle)
    
    expect(screen.getByText(/next brew suggestions/i)).toBeInTheDocument()
    expect(screen.getByText(/recommended grind/i)).toBeInTheDocument()
    expect(screen.getByText(/recommended ratio/i)).toBeInTheDocument()
  })
})
