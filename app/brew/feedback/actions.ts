'use server'

import { db } from '../../lib/database'
import { BrewFeedbackModel } from '../../lib/generated-models/BrewFeedback'
import type { Kysely } from 'kysely'
import type { DB } from '../../lib/db.d'
import type { BrewFeedbackInput } from '../types'

// Allow dependency injection for testing
let testDb: Kysely<DB> | null = null

/**
 * Sets a test database instance for dependency injection during testing
 * @param database - The Kysely database instance to use, or null to reset
 */
export async function setTestDatabase(database: Kysely<DB> | null) {
  testDb = database
}

/**
 * Returns the active database connection, preferring the test database if set
 * @returns The current Kysely database instance
 */
function getDatabase() {
  return testDb || db
}

/**
 * Persists brew feedback including taste characteristics and overall rating
 * @param brewId - The ID of the brew to attach feedback to
 * @param feedback - The feedback data containing taste flags and rating
 * @returns Object with success status and either the saved feedback data or an error message
 */
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
