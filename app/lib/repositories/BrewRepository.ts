import { BaseRepository } from './BaseRepository'
import { DB } from '../db.d'
import { Kysely } from 'kysely'

export interface BrewWithDetails {
  id: number
  bean_id: number | null
  method_id: number | null
  grinder_id: number | null
  water: number | null
  dose: number | null
  grind: number | null
  ratio: number | null
  created_at: Date
  bean_name?: string
  method_name?: string
  grinder_name?: string
  feedback?: {
    overall_rating: number | null
    too_strong: boolean
    too_weak: boolean
    is_sour: boolean
    is_bitter: boolean
    coffee_amount_ml: number | null
  }
}

export interface CreateBrewData {
  bean_id: number
  method_id: number
  grinder_id: number
  water: number
  dose: number
  grind: number
  ratio: number
}

/**
 * Repository for managing brew records with support for joined queries
 * that include related bean, method, grinder, and feedback data.
 * Extends BaseRepository to inherit standard CRUD operations on the brews table.
 */
export class BrewRepository extends BaseRepository<'brews'> {
  /**
   * Creates a new BrewRepository instance bound to the brews table.
   * @param db - The Kysely database instance for executing queries
   */
  constructor(db: Kysely<DB>) {
    super(db, 'brews')
  }

  /**
   * Creates a new brew record and returns the full record with its generated ID.
   * @param data - The brew data to insert (bean, method, grinder IDs and brewing parameters)
   * @returns The newly created brew record
   */
  async create(data: CreateBrewData) {
    const [result] = await this._db
      .insertInto('brews')
      .values(data)
      .returning('id')
      .execute()

    return this.findById(result.id)
  }

  /**
   * Finds all brews matching the given bean, method, and grinder combination,
   * joined with related tables to include names and feedback data.
   * Results are ordered by creation date descending (newest first).
   * @param beanId - The bean ID to filter by
   * @param methodId - The brewing method ID to filter by
   * @param grinderId - The grinder ID to filter by
   * @returns Array of brew records with joined bean, method, grinder names and feedback
   */
  async findByParameters(
    beanId: number,
    methodId: number,
    grinderId: number
  ): Promise<BrewWithDetails[]> {
    return (await this._db
      .selectFrom('brews')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .where('brews.bean_id', '=', beanId)
      .where('brews.method_id', '=', methodId)
      .where('brews.grinder_id', '=', grinderId)
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'brews.water',
        'brews.dose',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name',
        'brew_feedback.overall_rating',
        'brew_feedback.too_strong',
        'brew_feedback.too_weak',
        'brew_feedback.is_sour',
        'brew_feedback.is_bitter',
        'brew_feedback.coffee_amount_ml',
      ])
      .orderBy('brews.created_at', 'desc')
      .execute()) as BrewWithDetails[]
  }

  /**
   * Finds a single brew by ID with joined bean, method, and grinder names.
   * Does not include feedback data.
   * @param id - The brew ID to look up
   * @returns The brew record with joined names, or undefined if not found
   */
  async findWithDetails(id: number): Promise<BrewWithDetails | undefined> {
    const result = await this._db
      .selectFrom('brews')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .where('brews.id', '=', id)
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'brews.water',
        'brews.dose',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name',
      ])
      .executeTakeFirst()

    return result as BrewWithDetails | undefined
  }

  /**
   * Finds the top-rated brews (overall rating >= 4) with all joined data
   * including bean, method, grinder names and full feedback details.
   * Results are ordered by rating descending.
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Array of top-rated brew records with joined details
   */
  async findTopRated(limit: number = 10): Promise<BrewWithDetails[]> {
    return (await this._db
      .selectFrom('brews')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .where('brew_feedback.overall_rating', '>=', 4)
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'brews.water',
        'brews.dose',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name',
        'brew_feedback.overall_rating',
        'brew_feedback.too_strong',
        'brew_feedback.too_weak',
        'brew_feedback.is_sour',
        'brew_feedback.is_bitter',
        'brew_feedback.coffee_amount_ml',
      ])
      .orderBy('brew_feedback.overall_rating', 'desc')
      .limit(limit)
      .execute()) as BrewWithDetails[]
  }
}
