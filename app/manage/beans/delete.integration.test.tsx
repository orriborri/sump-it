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

// Mock confirm dialog
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
})

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

  it('deletes bean when confirmed', async () => {
    // Create test bean
    const bean = await beansModel.create({
      name: 'Test Bean to Delete'
    })

    // Mock confirm to return true
    vi.mocked(window.confirm).mockReturnValue(true)

    render(<DeleteButton beanId={bean!.id} beanName="Test Bean to Delete" />)
    
    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    await waitFor(async () => {
      const deletedBean = await beansModel.findById(bean!.id)
      expect(deletedBean).toBeUndefined()
    })

    expect(window.confirm).toHaveBeenCalledWith('Delete "Test Bean to Delete"?')
  })

  it('does not delete bean when cancelled', async () => {
    // Create test bean
    const bean = await beansModel.create({
      name: 'Test Bean to Keep'
    })

    // Mock confirm to return false
    vi.mocked(window.confirm).mockReturnValue(false)

    render(<DeleteButton beanId={bean!.id} beanName="Test Bean to Keep" />)
    
    const deleteButton = screen.getByRole('button')
    fireEvent.click(deleteButton)

    await waitFor(async () => {
      const existingBean = await beansModel.findById(bean!.id)
      expect(existingBean).toBeDefined()
      expect(existingBean?.name).toBe('Test Bean to Keep')
    })

    expect(window.confirm).toHaveBeenCalledWith('Delete "Test Bean to Keep"?')
  })
})
