import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import BeansPage from './page'
import { db } from '../../lib/database'
import { BeansModel } from '../../lib/generated-models/Beans'

// Mock Next.js Link component only
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

describe('BeansPage Integration Tests', () => {
  let beansModel: BeansModel

  beforeEach(async () => {
    beansModel = new BeansModel(db)
    // Clean up test data
    await db.deleteFrom('beans').execute()
  })

  afterEach(async () => {
    // Clean up test data
    await db.deleteFrom('beans').execute()
  })

  it('displays empty state when no beans in database', async () => {
    const page = await BeansPage()
    render(page)
    
    expect(screen.getByText(/no coffee beans yet/i)).toBeInTheDocument()
    expect(screen.getAllByText(/add bean/i).length).toBeGreaterThan(0)
  })

  it('fetches and displays real beans from database', async () => {
    // Insert test data using only name field to avoid schema issues
    await beansModel.create({
      name: 'Test Ethiopian'
    })
    
    await beansModel.create({
      name: 'Test Brazilian'
    })

    const page = await BeansPage()
    render(page)
    
    expect(screen.getByText('Test Ethiopian')).toBeInTheDocument()
    expect(screen.getByText('Test Brazilian')).toBeInTheDocument()
  })

  it('handles beans with minimal data', async () => {
    await beansModel.create({
      name: 'Minimal Bean'
    })

    const page = await BeansPage()
    render(page)
    
    expect(screen.getByText('Minimal Bean')).toBeInTheDocument()
  })
})
