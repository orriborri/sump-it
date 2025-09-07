import { render, screen } from '@testing-library/react'
import RatePage from './page'

// Mock the database calls
vi.mock('../../../lib/database', () => ({
  db: {}
}))

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

describe('Rate Page', () => {
  it('renders shareable brew rating page', async () => {
    // Mock the database query
    vi.doMock('../actions', () => ({
      getBrewDetails: vi.fn().mockResolvedValue(mockBrewData)
    }))
    
    const page = await RatePage({ params: { id: '1' } })
    render(page)
    
    expect(screen.getByText(/rate this brew/i)).toBeInTheDocument()
    expect(screen.getByText('Ethiopian Yirgacheffe')).toBeInTheDocument()
  })

  it('shows collaborative rating interface', async () => {
    vi.doMock('../actions', () => ({
      getBrewDetails: vi.fn().mockResolvedValue(mockBrewData)
    }))
    
    const page = await RatePage({ params: { id: '1' } })
    render(page)
    
    expect(screen.getByText(/your rating/i)).toBeInTheDocument()
    expect(screen.getByText(/add feedback/i)).toBeInTheDocument()
  })
})
