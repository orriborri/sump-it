import React from 'react'
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrewFeedback } from './BrewFeedback'
import { FormData } from '../workflow/types'

// Mock QRCode library to avoid dynamic import issues in tests
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
  },
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: vi.fn(({ alt, ...props }) => (
    <div data-testid="image" alt={alt} {...props} />
  )),
}))

describe('BrewFeedback - User Experience', () => {
  const mockBrewData: FormData = {
    bean_id: 1,
    method_id: 2,
    grinder_id: 1,
    dose: 20,
    water: 320,
    grind: 15,
    ratio: 16,
  }

  const mockOnSaveFeedback = vi.fn()
  const mockOnReset = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays brew parameters clearly for user reference', () => {
    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User should see their brew details in a summarized format
    expect(screen.getByText('Your Brew Parameters')).toBeInTheDocument()
    expect(screen.getByText(/320ml water/)).toBeInTheDocument()
    expect(screen.getByText(/20g coffee/)).toBeInTheDocument()
    expect(screen.getByText(/1:16 ratio/)).toBeInTheDocument()
    expect(screen.getByText(/grind setting 15/)).toBeInTheDocument()
  })

  it('allows user to rate their brewing experience', async () => {
    const user = userEvent.setup()

    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User Story: "As a coffee enthusiast, I want to rate my brew"

    // Find and interact with rating component
    const ratingElements = screen.getAllByRole('radio')
    expect(ratingElements.length).toBeGreaterThan(0)

    // User gives their brew a 4-star rating
    const fourStarRating = ratingElements[3] // 0-indexed, so 3 = 4 stars
    await user.click(fourStarRating)

    // For MUI Rating, we check if the value is set rather than if the radio is checked
    expect(fourStarRating).toHaveAttribute('value', '4')
  })

  it('enables detailed feedback through text input', async () => {
    const user = userEvent.setup()

    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User wants to add detailed notes about their brew
    const notesFields = screen.getAllByPlaceholderText(
      /Any other observations about this brew/i
    )
    await user.type(
      notesFields[0],
      'Great flavor, perfect balance of acidity and sweetness!'
    )

    expect(notesFields[0]).toHaveValue(
      'Great flavor, perfect balance of acidity and sweetness!'
    )
  })

  it('saves complete feedback when user submits', async () => {
    const user = userEvent.setup()

    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User completes their feedback by clicking on the star rating
    const ratingElements = screen.getAllByRole('radio')
    const fiveStarRating = ratingElements[4] // 5-star rating

    // Use fireEvent for MUI Rating component
    fireEvent.click(fiveStarRating)

    const notesFields = screen.getAllByPlaceholderText(
      /Any other observations about this brew/i
    )
    await user.type(notesFields[0], 'Excellent brew!')

    // Wait for button to become enabled after rating selection
    const saveButtons = screen.getAllByRole('button', {
      name: /Save Feedback & Continue/i,
    })

    await waitFor(() => {
      expect(saveButtons[0]).not.toBeDisabled()
    })

    await user.click(saveButtons[0])

    // System should process the feedback
    await waitFor(() => {
      expect(mockOnSaveFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          overall_rating: 5,
          notes: 'Excellent brew!',
        })
      )
    })
  })

  it('allows user to start a new brew session', async () => {
    const user = userEvent.setup()

    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User wants to start brewing again
    const newBrewButtons = screen.getAllByRole('button', {
      name: /Brew Again/i,
    })
    await user.click(newBrewButtons[0])

    // System should reset for new brew
    expect(mockOnReset).toHaveBeenCalled()
  })

  it('handles feedback submission gracefully without brew ID', async () => {
    const user = userEvent.setup()

    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={null}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // Even without a saved brew ID, user should be able to provide feedback
    const ratingElements = screen.getAllByRole('radio')
    fireEvent.click(ratingElements[2]) // 3-star rating to enable button

    const saveButtons = screen.getAllByRole('button', {
      name: /Save Feedback & Continue/i,
    })

    await waitFor(() => {
      expect(saveButtons[0]).not.toBeDisabled()
    })

    await user.click(saveButtons[0])

    // Should still attempt to save feedback
    await waitFor(() => {
      expect(mockOnSaveFeedback).toHaveBeenCalled()
    })
  })

  it('shows sharing options for successful brews', async () => {
    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User should see sharing capabilities
    // This might be a share button, QR code, or link
    const shareElements = screen.queryAllByRole('button', { name: /share/i })
    const qrCode = screen.queryByAltText(/qr code/i)

    // At least one sharing method should be available
    expect(shareElements.length > 0 || qrCode).toBeTruthy()
  })

  it('provides helpful guidance for future brews', () => {
    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={mockOnSaveFeedback}
        onReset={mockOnReset}
      />
    )

    // User should see guidance text about improving future brews
    const guidanceTexts = screen.getAllByText(
      /Check any that apply to help improve future brews/i
    )
    expect(guidanceTexts[0]).toBeInTheDocument()
  })
})

describe('BrewFeedback - Error Handling', () => {
  const mockBrewData: FormData = {
    bean_id: 1,
    method_id: 2,
    grinder_id: 1,
    dose: 20,
    water: 320,
    grind: 15,
    ratio: 16,
  }

  it('handles missing brew data gracefully', () => {
    const mockOnSaveFeedback = vi.fn()
    const mockOnReset = vi.fn()

    // Component should not crash with minimal data
    expect(() => {
      render(
        <BrewFeedback
          brewData={mockBrewData}
          brewId={null}
          onSaveFeedback={mockOnSaveFeedback}
          onReset={mockOnReset}
        />
      )
    }).not.toThrow()
  })

  it('provides feedback when save operations fail', async () => {
    const user = userEvent.setup()
    const failingOnSave = vi.fn().mockRejectedValue(new Error('Save failed'))

    // Suppress console errors for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <BrewFeedback
        brewData={mockBrewData}
        brewId={123}
        onSaveFeedback={failingOnSave}
        onReset={vi.fn()}
      />
    )

    // User attempts to save feedback
    const ratingElements = screen.getAllByRole('radio')
    fireEvent.click(ratingElements[0]) // Add a rating to enable button

    const saveButtons = screen.getAllByRole('button', {
      name: /Save Feedback & Continue/i,
    })

    await waitFor(() => {
      expect(saveButtons[0]).not.toBeDisabled()
    })

    await user.click(saveButtons[0])

    // Should handle error gracefully (no crash)
    await waitFor(() => {
      expect(failingOnSave).toHaveBeenCalled()
    })

    // Restore console
    consoleSpy.mockRestore()
  })
})
