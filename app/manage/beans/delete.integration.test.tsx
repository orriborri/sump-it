import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { DeleteButton } from './DeleteButton'
import { db } from '../../lib/database'
import { BeansModel } from '../../lib/generated-models/Beans'

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Delete Bean Integration Tests', () => {
  let beansModel: BeansModel

  beforeEach(async () => {
    beansModel = new BeansModel(db)
    await db.deleteFrom('beans').execute()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await db.deleteFrom('beans').execute()
  })

  it('deletes bean when confirmed in modal', async () => {
    // Create test bean
    const bean = await beansModel.create({
      name: 'Test Bean to Delete'
    })

    render(<DeleteButton beanId={bean!.id} beanName="Test Bean to Delete" />)
    
    // Click delete button to open modal
    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    // Verify modal is open
    expect(screen.getByText('Delete Coffee Bean')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete "Test Bean to Delete"?')).toBeInTheDocument()

    // Click confirm delete
    const confirmButton = screen.getByText('Delete')
    fireEvent.click(confirmButton)

    await waitFor(async () => {
      const deletedBean = await beansModel.findById(bean!.id)
      expect(deletedBean).toBeUndefined()
    })
  })

  it('does not delete bean when cancelled in modal', async () => {
    // Create test bean
    const bean = await beansModel.create({
      name: 'Test Bean to Keep'
    })

    render(<DeleteButton beanId={bean!.id} beanName="Test Bean to Keep" />)
    
    // Click delete button to open modal
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    // Click cancel
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    await waitFor(async () => {
      const existingBean = await beansModel.findById(bean!.id)
      expect(existingBean).toBeDefined()
      expect(existingBean?.name).toBe('Test Bean to Keep')
    })
  })
})
