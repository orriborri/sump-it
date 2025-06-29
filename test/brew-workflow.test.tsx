import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrewForm } from '../app/brew/components/BrewForm'
import { saveBrew } from '../app/brew/workflow/actions'

// Mock the server action
vi.mock('../app/brew/workflow/actions')

describe('Coffee Brewing User Journey', () => {
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
    vi.mocked(saveBrew).mockResolvedValue({ success: true, brew: { id: 123 } })
  })

  it('allows a user to complete a full coffee brewing workflow', async () => {
    const mockOnSubmit = vi.fn()

    render(
      <BrewForm
        onSubmit={mockOnSubmit}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // User should be able to see and select their coffee beans
    expect(screen.getByText(/select.*bean/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/bean/i), '1')

    // User should be able to select their brewing method
    await user.selectOptions(screen.getByLabelText(/method/i), '1')

    // User should be able to select their grinder
    await user.selectOptions(screen.getByLabelText(/grinder/i), '1')

    // User should be able to input coffee dose
    const doseInput = screen.getByLabelText(/dose/i)
    await user.clear(doseInput)
    await user.type(doseInput, '20')

    // User should see water amount calculated automatically based on ratio
    const waterDisplay = screen.getByDisplayValue(/320/i) // 20g * 16:1 ratio
    expect(waterDisplay).toBeInTheDocument()

    // User should be able to adjust grind setting
    const grindInput = screen.getByLabelText(/grind/i)
    await user.clear(grindInput)
    await user.type(grindInput, '15')

    // User should be able to submit the brew
    const submitButton = screen.getByRole('button', {
      name: /start brew|save brew/i,
    })
    await user.click(submitButton)

    // The brew should be saved with the correct data
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

  it('prevents submission with incomplete data and shows helpful guidance', async () => {
    const mockOnSubmit = vi.fn()

    render(
      <BrewForm
        onSubmit={mockOnSubmit}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // Try to submit without selecting all required fields
    const submitButton = screen.getByRole('button', {
      name: /start brew|save brew/i,
    })
    await user.click(submitButton)

    // Should show validation errors
    expect(screen.getByText(/bean.*required/i)).toBeInTheDocument()
    expect(screen.getByText(/method.*required/i)).toBeInTheDocument()
    expect(screen.getByText(/grinder.*required/i)).toBeInTheDocument()

    // Should not submit
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('calculates water amount automatically when dose or ratio changes', async () => {
    render(
      <BrewForm
        onSubmit={vi.fn()}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // Change dose to 25g
    const doseInput = screen.getByLabelText(/dose/i)
    await user.clear(doseInput)
    await user.type(doseInput, '25')

    // Water should update to 400ml (25g * 16:1)
    await waitFor(() => {
      expect(screen.getByDisplayValue('400')).toBeInTheDocument()
    })

    // Change ratio to 1:15
    const ratioInput = screen.getByLabelText(/ratio/i)
    await user.clear(ratioInput)
    await user.type(ratioInput, '15')

    // Water should update to 375ml (25g * 15:1)
    await waitFor(() => {
      expect(screen.getByDisplayValue('375')).toBeInTheDocument()
    })
  })

  it('shows helpful recommendations based on previous brews', async () => {
    const mockOnSubmit = vi.fn()

    render(
      <BrewForm
        onSubmit={mockOnSubmit}
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // Select bean, method, and grinder
    await user.selectOptions(screen.getByLabelText(/bean/i), '1')
    await user.selectOptions(screen.getByLabelText(/method/i), '1')
    await user.selectOptions(screen.getByLabelText(/grinder/i), '1')

    // Should show recommendation section or suggested parameters
    await waitFor(() => {
      expect(
        screen.getByText(/recommended|suggestion|previous/i)
      ).toBeInTheDocument()
    })
  })
})
