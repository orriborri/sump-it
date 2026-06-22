'use server'

import { db } from '../lib/database'
import { BrewsModel } from '../lib/generated-models/Brews'

import { BrewsJoinedQueries } from '../lib/generated-models/BrewsJoined'
import { FormData } from './types'
import type { Kysely } from 'kysely'
import type { DB } from '../lib/db.d'

// Allow dependency injection for testing
let testDb: Kysely<DB> | null = null

/**
 * Sets a test database instance for dependency injection during testing
 * @param database - The Kysely database instance to use, or null to reset to production database
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
 * Creates model instances using the current database connection
 * @returns Object containing initialized BrewsModel and BrewsJoinedQueries instances
 */
function getModels() {
  const currentDb = getDatabase()
  return {
    brewsModel: new BrewsModel(currentDb),
    brewsJoined: new BrewsJoinedQueries(currentDb),
  }
}

import { BrewsWithJoins } from '../lib/generated-models/BrewsJoined'

/**
 * Retrieves previous brews matching the given equipment combination
 * Used to display brew history and suggest parameters for future brews
 * @param bean_id - The ID of the coffee bean as a string
 * @param method_id - The ID of the brewing method as a string
 * @param grinder_id - The ID of the grinder as a string
 * @returns Array of previous brews with joined equipment data, or empty array on failure
 */
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
  } catch {
    return []
  }
}

/**
 * Persists a new brew record to the database with the provided form data
 * @param data - The brew form data containing equipment IDs and brewing parameters
 * @returns Object with success status and either the saved brew or an error message
 */
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
  } catch {
    return { success: false, error: 'Failed to save brew' }
  }
}

// Feedback actions moved to feedback/actions.ts
