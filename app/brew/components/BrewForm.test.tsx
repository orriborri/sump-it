import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrewForm } from './BrewForm'

// Mock only external dependencies, not internal implementation
vi.mock('../workflow/actions', () => ({
  saveBrew: vi.fn(),
}))

describe('BrewForm - User Brewing Experience', () => {
  const mockBeans = [
    {
      id: 1,
      name: 'Ethiopian Sidamo',
      roast_level: 'Light',
      origin: 'Ethiopia',
    },
    {
      id: 2,
      name: 'Colombian Supremo',
      roast_level: 'Medium',
      origin: 'Colombia',
    },
  ]

  const mockMethods = [
    { id: 1, name: 'Pour Over V60', category: 'pour-over' },
    { id: 2, name: 'French Press', category: 'immersion' },
  ]

  const mockGrinders = [
    { id: 1, name: 'Baratza Encore', type: 'burr' },
    { id: 2, name: 'Manual Hand Grinder', type: 'manual' },
  ]

  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('guides user through complete brewing setup workflow', async () => {
    const mockOnSubmit = vi.fn()

    render(
      <BrewForm
        onSubmit={mockOnSubmit}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // User Story: "As a coffee enthusiast, I want to set up my brew parameters"

    // User selects their coffee beans
    expect(screen.getByText(/select.*bean/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/bean/i), '1')

    // User chooses brewing method
    await user.selectOptions(screen.getByLabelText(/method/i), '1')

    // User selects their grinder
    await user.selectOptions(screen.getByLabelText(/grinder/i), '1')

    // User sets coffee dose amount
    const doseInput = screen.getByLabelText(/dose/i)
    await user.clear(doseInput)
    await user.type(doseInput, '20')

    // System automatically calculates water amount (behavior, not implementation)
    const waterDisplay = screen.getByDisplayValue(/320/i) // Expected: 20g * 16:1 ratio
    expect(waterDisplay).toBeInTheDocument()

    // User adjusts grind setting
    const grindInput = screen.getByLabelText(/grind/i)
    await user.clear(grindInput)
    await user.type(grindInput, '15')

    // User starts their brew
    const submitButton = screen.getByRole('button', {
      name: /start brew|save brew/i,
    })
    await user.click(submitButton)

    // System saves brew with user's preferences
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          bean_id: '1',
          method_id: '1',
          grinder_id: '1',
          dose: 20,
          water: 320,
          grind: 15,
          ratio: 16,
        })
      )
    })
  })

  it('prevents invalid submissions and provides helpful feedback', async () => {
    const mockOnSubmit = vi.fn()

    render(
      <BrewForm
        onSubmit={mockOnSubmit}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // User Story: "When I forget to fill required fields, I should get clear guidance"

    // User attempts to submit incomplete form
    const submitButton = screen.getByRole('button', {
      name: /start brew|save brew/i,
    })
    await user.click(submitButton)

    // System shows clear validation messages
    expect(screen.getByText(/bean.*required/i)).toBeInTheDocument()
    expect(screen.getByText(/method.*required/i)).toBeInTheDocument()
    expect(screen.getByText(/grinder.*required/i)).toBeInTheDocument()

    // System prevents invalid submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('automatically updates water calculations when parameters change', async () => {
    render(
      <BrewForm
        onSubmit={vi.fn()}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // User Story: "When I change my coffee dose, water amount should update automatically"

    // User increases coffee dose
    const doseInput = screen.getByLabelText(/dose/i)
    await user.clear(doseInput)
    await user.type(doseInput, '25')

    // Water amount updates automatically
    await waitFor(() => {
      expect(screen.getByDisplayValue('400')).toBeInTheDocument() // 25g * 16:1
    })

    // User adjusts brewing ratio
    const ratioInput = screen.getByLabelText(/ratio/i)
    await user.clear(ratioInput)
    await user.type(ratioInput, '15')

    // Water amount recalculates
    await waitFor(() => {
      expect(screen.getByDisplayValue('375')).toBeInTheDocument() // 25g * 15:1
    })
  })
})
