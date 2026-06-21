import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FormWrapper from '../app/brew/FormWrapper'

describe('FormWrapper Integration', () => {
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

  it('renders without children', () => {
    const { container } = render(<FormWrapper />)

    expect(container.querySelector('.MuiContainer-root')).toBeInTheDocument()
  })
})
