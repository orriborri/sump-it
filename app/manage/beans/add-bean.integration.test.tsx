import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AddBeanForm } from '../AddBeanForm'
import { db } from '../../lib/database'
import { BeansModel } from '../../lib/generated-models/Beans'

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Add Bean Integration Tests', () => {
  let beansModel: BeansModel

  beforeEach(async () => {
    beansModel = new BeansModel(db)
    await db.deleteFrom('beans').execute()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await db.deleteFrom('beans').execute()
  })

  it('saves bean to database when form is submitted', async () => {
    render(<AddBeanForm />)
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/bean name/i), {
      target: { value: 'Test Ethiopian Bean' }
    })
    fireEvent.change(screen.getByLabelText(/roaster/i), {
      target: { value: 'Test Roastery' }
    })
    
    // Submit the form
    fireEvent.click(screen.getByText(/add coffee bean/i))
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/coffee bean added successfully/i)).toBeInTheDocument()
    })
    
    // Verify bean was saved to database
    const beans = await beansModel.findAll()
    expect(beans).toHaveLength(1)
    expect(beans[0].name).toBe('Test Ethiopian Bean')
    expect(beans[0].rostery).toBe('Test Roastery')
  })

  it('handles form validation errors', async () => {
    render(<AddBeanForm />)
    
    // Submit form without required fields
    fireEvent.click(screen.getByText(/add coffee bean/i))
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/bean name is required/i)).toBeInTheDocument()
    })
    
    // Verify no bean was saved
    const beans = await beansModel.findAll()
    expect(beans).toHaveLength(0)
  })
})
