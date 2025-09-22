'use server'

import { db } from '../../lib/database'
import { BrewFeedbackModel } from '../../lib/generated-models/BrewFeedback'
import type { Kysely } from 'kysely'
import type { Database } from '../../lib/db'

// Interface for feedback input data
interface BrewFeedbackInput {
  coffee_amount_ml?: number | null
  too_strong?: boolean
  too_weak?: boolean
  is_sour?: boolean
  is_bitter?: boolean
  overall_rating?: number | null
}

// Allow dependency injection for testing
let testDb: Kysely<Database> | null = null

export async function setTestDatabase(database: Kysely<Database> | null) {
  testDb = database
}

function getDatabase() {
  return testDb || db
}

export async function saveBrewFeedback(brewId: number, feedback: BrewFeedbackInput) {
  try {
    const currentDb = getDatabase()
    const feedbackModel = new BrewFeedbackModel(currentDb as any)
    
    const savedFeedback = await feedbackModel.create({
      brew_id: brewId,
      coffee_amount_ml: feedback.coffee_amount_ml || null,
      too_strong: feedback.too_strong || false,
      too_weak: feedback.too_weak || false,
      is_sour: feedback.is_sour || false,
      is_bitter: feedback.is_bitter || false,
      overall_rating: feedback.overall_rating || null,
    })

    return { success: true, feedback: savedFeedback }
  } catch {
    return { success: false, error: 'Failed to save feedback' }
  }
}