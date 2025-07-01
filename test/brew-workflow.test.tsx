import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormWrapper from '../app/brew/FormWrapper'
import { saveBrew } from '../app/brew/enhanced-actions'

// Mock the saveBrew function
vi.mock('../app/brew/enhanced-actions', () => ({
  saveBrew: vi.fn(),
  saveBrewFeedback: vi.fn(),
}))

// Mock database dependency
vi.mock('../app/lib/database', () => ({
  db: {},
}))

// Mock the Form component
vi.mock('../app/brew/Form', () => ({
  Form: ({ onSubmit, beans, methods, grinders }: any) => (
    <div data-testid="brew-form">
      <button
        onClick={() =>
          onSubmit({
            bean_id: 1,
            method_id: 1,
            grinder_id: 1,
            dose: 20,
            water: 320,
            grind: 15,
            ratio: '16',
          })
        }
      >
        Submit Brew
      </button>
    </div>
  ),
}))

// Mock the EnhancedBrewFeedback component
vi.mock('../app/brew/feedback/EnhancedBrewFeedback', () => ({
  EnhancedBrewFeedback: ({ onSaveFeedback }: any) => (
    <div data-testid="brew-feedback">
      <button onClick={() => onSaveFeedback({ rating: 5, notes: 'Great!' })}>
        Save Feedback
      </button>
    </div>
  ),
}))

describe('FormWrapper Integration', () => {
  const mockBeans = [
    {
      id: 1,
      name: 'Test Bean',
      roster: 'Test Roaster',
      rostery: 'Test Rostery',
      created_at: new Date(),
    },
  ]
  const mockMethods = [
    { id: 1, name: 'V60', created_at: new Date() },
  ]
  const mockGrinders = [
    {
      id: 1,
      name: 'Test Grinder',
      min_setting: 1,
      max_setting: 20,
      step_size: 1,
      setting_type: 'numeric',
      created_at: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the brew form initially', () => {
    render(
      <FormWrapper
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    expect(screen.getByTestId('brew-form')).toBeInTheDocument()
  })

  it('transitions to feedback after successful brew submission', async () => {
    const mockSaveBrew = vi.mocked(saveBrew)
    mockSaveBrew.mockResolvedValue({
      success: true,
      brew: {
        id: 1,
        bean_id: 1,
        method_id: 1,
        grinder_id: 1,
        dose: 20,
        water: 320,
        grind: 15,
        ratio: '16',
        created_at: new Date(),
      },
    })

    render(
      <FormWrapper
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    const submitButton = screen.getByText('Submit Brew')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('brew-feedback')).toBeInTheDocument()
    })
  })

  it('returns to form after feedback submission', async () => {
    const mockSaveBrew = vi.mocked(saveBrew)
    mockSaveBrew.mockResolvedValue({
      success: true,
      brew: {
        id: 1,
        bean_id: 1,
        method_id: 1,
        grinder_id: 1,
        dose: 20,
        water: 320,
        grind: 15,
        ratio: '16',
        created_at: new Date(),
      },
    })

    render(
      <FormWrapper
        beans={mockBeans}
        methods={mockMethods}
        grinders={mockGrinders}
      />
    )

    // Submit brew
    const submitButton = screen.getByText('Submit Brew')
    await userEvent.click(submitButton)

    // Wait for feedback form
    await waitFor(() => {
      expect(screen.getByTestId('brew-feedback')).toBeInTheDocument()
    })

    // Submit feedback
    const feedbackButton = screen.getByText('Save Feedback')
    await userEvent.click(feedbackButton)

    // Should return to form
    await waitFor(() => {
      expect(screen.getByTestId('brew-form')).toBeInTheDocument()
    })
  })
})
