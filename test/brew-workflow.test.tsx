import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FormWrapper from '../app/brew/FormWrapper'

describe('FormWrapper Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the brew form initially', () => {
    render(
      <FormWrapper>
        <div data-testid="brew-form" />
      </FormWrapper>
    )

    expect(screen.getByTestId('brew-form')).toBeInTheDocument()
  })

  it('renders children within a container', () => {
    render(
      <FormWrapper>
        <p>Test content</p>
      </FormWrapper>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    render(
      <FormWrapper>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </FormWrapper>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })
})
