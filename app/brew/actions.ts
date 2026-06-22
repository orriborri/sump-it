'use server'

import { db } from '../lib/database'
import { BrewsModel } from '../lib/generated-models/Brews'

import { BrewsJoinedQueries, BrewsWithJoins } from '../lib/generated-models/BrewsJoined'
import { FormData } from './types'
import type { Kysely } from 'kysely'
import type { DB } from '../lib/db.d'

// Allow dependency injection for testing
let testDb: Kysely<DB> | null = null

/** Sets a test database instance for dependency injection during testing. */
export async function setTestDatabase(database: Kysely<DB> | null) {
  testDb = database
}

/** Returns the active database instance (test or production). */
function getDatabase() {
  return testDb || db
}

/** Initializes and returns model instances using the current database connection. */
function getModels() {
  const currentDb = getDatabase()
  return {
    brewsModel: new BrewsModel(currentDb),
    brewsJoined: new BrewsJoinedQueries(currentDb),
  }
}

/** Retrieves previous brews matching the given bean, method, and grinder combination. */
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

/** Persists a new brew record to the database from the form data. */
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
