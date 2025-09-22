'use server'

import { db } from '../lib/database'
import { BrewsModel } from '../lib/generated-models/Brews'

import { BrewsJoinedQueries } from '../lib/generated-models/BrewsJoined'
import { FormData } from './types'
import type { Kysely } from 'kysely'
import type { Database } from '../lib/db'
import type { DB } from '../lib/db.d'

// Allow dependency injection for testing
let testDb: Kysely<Database> | null = null

export async function setTestDatabase(database: Kysely<Database> | null) {
  testDb = database
}

function getDatabase() {
  return testDb || db
}

// Initialize models with current database
function getModels() {
  const currentDb = getDatabase()
  return {
    brewsModel: new BrewsModel(currentDb as Kysely<DB>),

    brewsJoined: new BrewsJoinedQueries(currentDb as Kysely<DB>),
  }
}

import { BrewsWithJoins } from '../lib/generated-models/BrewsJoined'

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
