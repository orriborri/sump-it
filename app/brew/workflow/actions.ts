'use server'

import { db } from '../../lib/database'
import { BrewsModel } from '../../lib/generated-models/Brews'
import { BrewFeedbackModel } from '../../lib/generated-models/BrewFeedback'
import { BrewsJoinedQueries } from '../../lib/generated-models/BrewsJoined'
import { FormData } from './types'
import type { Kysely } from 'kysely'
import type { Database } from '../../lib/db'

// Allow dependency injection for testing
let testDb: Kysely<Database> | null = null

export function setTestDatabase(database: Kysely<Database> | null) {
  testDb = database
}

function getDatabase() {
  return testDb || db
}

// Initialize models with current database
function getModels() {
  const currentDb = getDatabase()
  return {
    brewsModel: new BrewsModel(currentDb),
    feedbackModel: new BrewFeedbackModel(currentDb),
    brewsJoined: new BrewsJoinedQueries(currentDb)
  }
}

import { BrewsWithJoins } from '../../lib/generated-models/BrewsJoined'

export async function getPreviousBrews(
  bean_id: string,
  method_id: string,
  grinder_id: string
): Promise<BrewsWithJoins[]> {
  if (!bean_id || !method_id || !grinder_id) {
    return []
  }

  try {
    const { brewsJoined } = getModels()
    return await brewsJoined.findByParameters(
      Number(bean_id),
      Number(method_id),
      Number(grinder_id)
    )
  } catch (error) {
    console.error('Error fetching previous brews:', error)
    return []
  }
}

export async function saveBrew(data: FormData) {
  try {
    const { brewsModel } = getModels()
    const savedBrew = await brewsModel.create({
      bean_id: Number(data.bean_id),
      method_id: Number(data.method_id),
      grinder_id: Number(data.grinder_id),
      water: data.water,
      dose: data.dose,
      grind: data.grind,
      ratio: data.ratio,
    })

    return { success: true, brew: savedBrew }
  } catch (error) {
    console.error('Error saving brew:', error)
    return { success: false, error: 'Failed to save brew' }
  }
}

export async function saveBrewFeedback(brewId: number, feedback: any) {
  try {
    const { feedbackModel } = getModels()
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
  } catch (error) {
    console.error('Error saving feedback:', error)
    return { success: false, error: 'Failed to save feedback' }
  }
}
