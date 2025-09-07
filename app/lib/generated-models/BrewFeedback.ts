import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type BrewFeedbackSelect = Selectable<DB['brew_feedback']>;
export type BrewFeedbackInsert = Insertable<DB['brew_feedback']>;
export type BrewFeedbackUpdate = Updateable<DB['brew_feedback']>;

/**
 * BrewFeedback Model - Provides CRUD operations for the brew_feedback table
 */
export class BrewFeedbackModel {
  constructor(private db: Kysely<DB>) {}

  /**
   * Create a new brew_feedbac record
   */
  async create(data: Omit<BrewFeedbackInsert, 'id' | 'created_at'>): Promise<BrewFeedbackSelect | undefined> {
    return await this.db
      .insertInto('brew_feedback')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a brew_feedbac by id
   */
  async findById(id: number): Promise<BrewFeedbackSelect | undefined> {
    return await this.db
      .selectFrom('brew_feedback')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all brew_feedback records
   */
  async findAll(): Promise<BrewFeedbackSelect[]> {
    return await this.db
      .selectFrom('brew_feedback')
      .selectAll()
      .execute();
  }

  /**
   * Update a brew_feedbac by id
   */
  async updateById(
    id: number, 
    data: BrewFeedbackUpdate
  ): Promise<BrewFeedbackSelect | undefined> {
    return await this.db
      .updateTable('brew_feedback')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a brew_feedbac by id
   */
  async deleteById(id: number): Promise<void> {
    await this.db
      .deleteFrom('brew_feedback')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total brew_feedback records
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('brew_feedback')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a brew_feedbac exists by id
   */
  async exists(id: number): Promise<boolean> {
    const result = await this.db
      .selectFrom('brew_feedback')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find brew_feedback with pagination
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<BrewFeedbackSelect[]> {
    return await this.db
      .selectFrom('brew_feedback')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple brew_feedback records
   */
  async createMany(data: Omit<BrewFeedbackInsert, 'id' | 'created_at'>[]): Promise<BrewFeedbackSelect[]> {
    return await this.db
      .insertInto('brew_feedback')
      .values(data)
      .returningAll()
      .execute();
  }
}