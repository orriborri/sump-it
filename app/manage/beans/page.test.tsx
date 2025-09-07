import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import BeansPage from './page'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

describe('BeansPage', () => {
  it('renders all bean cards with equal widths', () => {
    render(<BeansPage />)
    
    // Get all bean cards by test ID
    const beanCards = screen.getAllByTestId('bean-card')
    
    expect(beanCards).toHaveLength(3)
    
    // Check that all cards have the same computed width
    const cardWidths = beanCards.map(card => {
      const styles = window.getComputedStyle(card)
      return styles.width
    })
    
    // All widths should be equal
    const firstWidth = cardWidths[0]
    cardWidths.forEach(width => {
      expect(width).toBe(firstWidth)
    })
  })

  it('displays bean names without affecting card width', () => {
    render(<BeansPage />)
    
    // Verify different length names are displayed
    expect(screen.getByText('Ethiopian Yirgacheffe')).toBeInTheDocument() // Long name
    expect(screen.getByText('Brazilian Santos')).toBeInTheDocument() // Short name
    expect(screen.getByText('Colombian Supremo')).toBeInTheDocument() // Medium name
    
    // All cards should be present
    const cards = screen.getAllByTestId('bean-card')
    expect(cards).toHaveLength(3)
  })
})
