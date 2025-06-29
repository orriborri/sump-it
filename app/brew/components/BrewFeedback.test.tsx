import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrewFeedback } from './BrewFeedback'

// Mock server actions
vi.mock('../workflow/enhanced-actions', () => ({
  saveBrewFeedback: vi.fn(),
}))

describe('BrewFeedback - User Experience Evaluation', () => {
  const mockBrew = {
    id: 123,
    bean_name: 'Ethiopian Sidamo',
    method_name: 'Pour Over V60',
    dose: 20,
    water: 320,
    ratio: 16,
    grind: 15,
    created_at: new Date().toISOString(),
  }

  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(
      require('../workflow/enhanced-actions').saveBrewFeedback
    ).mockResolvedValue({ success: true })
  })

  it('allows user to rate their complete brewing experience', async () => {
    const mockOnFeedbackSaved = vi.fn()

    render(
      <BrewFeedback brew={mockBrew} onFeedbackSaved={mockOnFeedbackSaved} />
    )

    // User Story: "After tasting my coffee, I want to record how it turned out"

    // User sees their brew details
    expect(screen.getByText(/Ethiopian Sidamo/i)).toBeInTheDocument()
    expect(screen.getByText(/Pour Over V60/i)).toBeInTheDocument()
    expect(screen.getByText(/20.*g/i)).toBeInTheDocument()
    expect(screen.getByText(/320.*ml/i)).toBeInTheDocument()

    // User rates overall experience
    const overallRating = screen.getByLabelText(/overall.*rating/i)
    await user.selectOptions(overallRating, '4')

    // User evaluates specific aspects
    const tasteRating = screen.getByLabelText(/taste/i)
    await user.selectOptions(tasteRating, '5')

    const strengthRating = screen.getByLabelText(/strength/i)
    await user.selectOptions(strengthRating, '3')

    // User adds notes about their experience
    const notesField = screen.getByLabelText(/notes|comments/i)
    await user.type(
      notesField,
      'Great aroma, slightly under-extracted. Try finer grind next time.'
    )

    // User saves their feedback
    const saveButton = screen.getByRole('button', { name: /save.*feedback/i })
    await user.click(saveButton)

    // System should save feedback with all details
    await waitFor(() => {
      expect(mockOnFeedbackSaved).toHaveBeenCalled()
    })
  })

  it('helps user track what worked and what needs adjustment', async () => {
    const mockOnFeedbackSaved = vi.fn()

    render(
      <BrewFeedback brew={mockBrew} onFeedbackSaved={mockOnFeedbackSaved} />
    )

    // User Story: "I want to remember what to change for next time"

    // User indicates areas for improvement
    const wouldChangeGrind = screen.getByLabelText(/grind.*setting/i)
    await user.check(wouldChangeGrind)

    const wouldChangeDose = screen.getByLabelText(/dose.*amount/i)
    await user.check(wouldChangeDose)

    // User provides specific adjustment notes
    const adjustmentNotes = screen.getByLabelText(/adjustments|next.*time/i)
    await user.type(
      adjustmentNotes,
      'Try 18g dose with grind setting 12 for more extraction'
    )

    // User rates whether they would brew this way again
    const wouldRepeat = screen.getByLabelText(/brew.*again|repeat/i)
    await user.click(wouldRepeat)

    // User saves learning for future reference
    const saveButton = screen.getByRole('button', { name: /save.*feedback/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnFeedbackSaved).toHaveBeenCalled()
    })
  })

  it('validates feedback before saving', async () => {
    const mockOnFeedbackSaved = vi.fn()

    render(
      <BrewFeedback brew={mockBrew} onFeedbackSaved={mockOnFeedbackSaved} />
    )

    // User Story: "System should guide me to provide complete feedback"

    // User tries to save without rating
    const saveButton = screen.getByRole('button', { name: /save.*feedback/i })
    await user.click(saveButton)

    // System should require overall rating
    expect(screen.getByText(/overall.*rating.*required/i)).toBeInTheDocument()
    expect(mockOnFeedbackSaved).not.toHaveBeenCalled()

    // User provides minimum required feedback
    const overallRating = screen.getByLabelText(/overall.*rating/i)
    await user.selectOptions(overallRating, '3')

    // Now save should work
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockOnFeedbackSaved).toHaveBeenCalled()
    })
  })

  it('shows feedback summary for quick reference', async () => {
    const mockBrewWithFeedback = {
      ...mockBrew,
      feedback: {
        overall_rating: 4,
        taste_rating: 5,
        strength_rating: 3,
        notes: 'Excellent flavor profile',
        would_make_again: true,
      },
    }

    render(
      <BrewFeedback
        brew={mockBrewWithFeedback}
        onFeedbackSaved={vi.fn()}
        viewMode="summary"
      />
    )

    // User Story: "I want to quickly see how this brew was rated"

    // Should show rating summary
    expect(screen.getByText(/4.*5/i)).toBeInTheDocument() // 4/5 rating display
    expect(screen.getByText(/Excellent flavor profile/i)).toBeInTheDocument()
    expect(screen.getByText(/would.*make.*again/i)).toBeInTheDocument()

    // Should show brew parameters for context
    expect(screen.getByText(/20.*g/i)).toBeInTheDocument()
    expect(screen.getByText(/grind.*15/i)).toBeInTheDocument()
  })

  it('suggests improvements based on rating patterns', async () => {
    const poorlyRatedBrew = {
      ...mockBrew,
      feedback: {
        overall_rating: 2,
        taste_rating: 2,
        strength_rating: 1, // Too weak
        notes: 'Under-extracted, weak flavor',
      },
    }

    render(
      <BrewFeedback
        brew={poorlyRatedBrew}
        onFeedbackSaved={vi.fn()}
        viewMode="summary"
      />
    )

    // User Story: "System should help me understand what went wrong"

    // Should show improvement suggestions
    expect(screen.getByText(/try.*finer.*grind/i)).toBeInTheDocument()
    expect(screen.getByText(/increase.*dose/i)).toBeInTheDocument()
    expect(screen.getByText(/under.*extracted/i)).toBeInTheDocument()
  })
})
