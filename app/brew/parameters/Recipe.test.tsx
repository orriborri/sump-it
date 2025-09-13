import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Recipe } from './Recipe'
import { FormData } from '../types'

const mockFormData: FormData = {
  bean_id: 1,
  method_id: 1,
  grinder_id: 1,
  dose: 15,
  water: 250,
  ratio: 16.67,
  grind: 20
}

const mockUpdateFormData = vi.fn()

describe('Recipe Component', () => {
  beforeEach(() => {
    mockUpdateFormData.mockClear()
  })

  it('renders all input fields', () => {
    render(<Recipe formData={mockFormData} updateFormData={mockUpdateFormData} />)
    
    expect(screen.getByLabelText('Coffee (g)')).toBeInTheDocument()
    expect(screen.getByLabelText('Water (ml)')).toBeInTheDocument()
    expect(screen.getByLabelText('Ratio (1:x)')).toBeInTheDocument()
  })

  it('starts with ratio locked by default', () => {
    render(<Recipe formData={mockFormData} updateFormData={mockUpdateFormData} />)
    
    expect(screen.getByLabelText('Ratio (1:x)')).toBeDisabled()
    expect(screen.getByText(/ratio locked/i)).toBeInTheDocument()
  })

  it('scales water when coffee changes (ratio locked)', () => {
    render(<Recipe formData={mockFormData} updateFormData={mockUpdateFormData} />)
    
    const coffeeInput = screen.getByLabelText('Coffee (g)')
    fireEvent.change(coffeeInput, { target: { value: '20' } })
    
    expect(mockUpdateFormData).toHaveBeenCalledWith({
      dose: 20,
      water: 333.4 // 20 * 16.67
    })
  })

  it('scales coffee when water changes (ratio locked)', () => {
    render(<Recipe formData={mockFormData} updateFormData={mockUpdateFormData} />)
    
    const waterInput = screen.getByLabelText('Water (ml)')
    fireEvent.change(waterInput, { target: { value: '300' } })
    
    expect(mockUpdateFormData).toHaveBeenCalledWith({
      water: 300,
      dose: 18 // 300 / 16.67
    })
  })

  it('unlocks ratio when lock button clicked', () => {
    render(<Recipe formData={mockFormData} updateFormData={mockUpdateFormData} />)
    
    const lockButton = screen.getByRole('button')
    fireEvent.click(lockButton)
    
    expect(screen.getByLabelText('Ratio (1:x)')).not.toBeDisabled()
    expect(screen.getByText(/ratio unlocked/i)).toBeInTheDocument()
  })

  it('recalculates ratio when coffee changes (ratio unlocked)', () => {
    render(<Recipe formData={mockFormData} updateFormData={mockUpdateFormData} />)
    
    // Unlock ratio first
    const lockButton = screen.getByRole('button')
    fireEvent.click(lockButton)
    
    const coffeeInput = screen.getByLabelText('Coffee (g)')
    fireEvent.change(coffeeInput, { target: { value: '20' } })
    
    expect(mockUpdateFormData).toHaveBeenCalledWith({
      dose: 20,
      ratio: 12.5 // 250 / 20
    })
  })
})
