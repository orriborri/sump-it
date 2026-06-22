'use server'

import { db } from '../../lib/database'
import { BrewFeedbackModel } from '../../lib/generated-models/BrewFeedback'
import type { Kysely } from 'kysely'
import type { DB } from '../../lib/db.d'
import type { BrewFeedbackInput } from '../types'

// Allow dependency injection for testing
let testDb: Kysely<DB> | null = null

export async function setTestDatabase(database: Kysely<DB> | null) {
  testDb = database
}

function getDatabase() {
  return testDb || db
}

export async function saveBrewFeedback(
  brewId: number,
  feedback: BrewFeedbackInput
) {
  try {
    const currentDb = getDatabase()
    const feedbackModel = new BrewFeedbackModel(currentDb)

    const savedFeedback = await feedbackModel.create({
      brew_id: brewId,
      coffee_amount_ml: feedback.coffee_amount_ml || null,
      too_strong: feedback.too_strong || false,
      too_weak: feedback.too_weak || false,
      is_sour: feedback.is_sour || false,
      is_bitter: feedback.is_bitter || false,
      overall_rating: feedback.overall_rating || null,
    })

    return { success: true, data: savedFeedback }
  } catch {
    return { success: false, error: 'Failed to save feedback' }
  }
}
