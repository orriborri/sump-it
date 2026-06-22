import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type BrewFeedbackSelect = Selectable<DB['brew_feedback']>;
export type BrewFeedbackInsert = Insertable<DB['brew_feedback']>;
export type BrewFeedbackUpdate = Updateable<DB['brew_feedback']>;

/**
 * BrewFeedback Model - Provides CRUD operations for the brew_feedback table
 */
export class BrewFeedbackModel {
  /**
   * Creates a new BrewFeedbackModel instance for querying the brew_feedback table.
   * @param _db - The Kysely database instance to use for queries
   */
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new brew feedback record
   * @param data - The feedback data to insert (excludes auto-generated id and created_at)
   * @returns The newly created feedback record, or undefined if the insert failed
   */
  async create(data: Omit<BrewFeedbackInsert, 'id' | 'created_at'>): Promise<BrewFeedbackSelect | undefined> {
    return await this._db
      .insertInto('brew_feedback')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a brew feedback record by id
   * @param id - The primary key of the feedback to find
   * @returns The matching feedback record, or undefined if not found
   */
  async findById(id: number): Promise<BrewFeedbackSelect | undefined> {
    return await this._db
      .selectFrom('brew_feedback')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all brew feedback records
   * @returns An array of all feedback records in the table
   */
  async findAll(): Promise<BrewFeedbackSelect[]> {
    return await this._db
      .selectFrom('brew_feedback')
      .selectAll()
      .execute();
  }

  /**
   * Update a brew feedback record by id
   * @param id - The primary key of the feedback to update
   * @param data - The fields to update on the feedback record
   * @returns The updated feedback record, or undefined if not found
   */
  async updateById(
    id: number, 
    data: BrewFeedbackUpdate
  ): Promise<BrewFeedbackSelect | undefined> {
    return await this._db
      .updateTable('brew_feedback')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a brew feedback record by id
   * @param id - The primary key of the feedback to delete
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('brew_feedback')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total brew feedback records
   * @returns The total number of feedback records
   */
  async count(): Promise<number> {
    const result = await this._db
      .selectFrom('brew_feedback')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a brew feedback record exists by id
   * @param id - The primary key to check
   * @returns True if a feedback record with the given id exists
   */
  async exists(id: number): Promise<boolean> {
    const result = await this._db
      .selectFrom('brew_feedback')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find brew feedback records with pagination
   * @param limit - Maximum number of records to return (default: 10)
   * @param offset - Number of records to skip (default: 0)
   * @returns An array of feedback records within the specified page
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<BrewFeedbackSelect[]> {
    return await this._db
      .selectFrom('brew_feedback')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple brew feedback records
   * @param data - Array of feedback data to insert (excludes auto-generated id and created_at)
   * @returns An array of the newly created feedback records
   */
  async createMany(data: Omit<BrewFeedbackInsert, 'id' | 'created_at'>[]): Promise<BrewFeedbackSelect[]> {
    return await this._db
      .insertInto('brew_feedback')
      .values(data)
      .returningAll()
      .execute();
  }
}