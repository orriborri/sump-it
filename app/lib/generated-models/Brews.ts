import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type BrewsSelect = Selectable<DB['brews']>;
export type BrewsInsert = Insertable<DB['brews']>;
export type BrewsUpdate = Updateable<DB['brews']>;

/**
 * Brews Model - Provides CRUD operations for the brews table
 */
export class BrewsModel {
  constructor(private db: Kysely<DB>) {} // eslint-disable-line no-unused-vars

  /**
   * Create a new brew record
   */
  async create(data: Omit<BrewsInsert, 'id' | 'created_at'>): Promise<BrewsSelect | undefined> {
    return await this.db
      .insertInto('brews')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a brew by id
   */
  async findById(id: number): Promise<BrewsSelect | undefined> {
    return await this.db
      .selectFrom('brews')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all brews records
   */
  async findAll(): Promise<BrewsSelect[]> {
    return await this.db
      .selectFrom('brews')
      .selectAll()
      .execute();
  }

  /**
   * Update a brew by id
   */
  async updateById(
    id: number, 
    data: BrewsUpdate
  ): Promise<BrewsSelect | undefined> {
    return await this.db
      .updateTable('brews')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a brew by id
   */
  async deleteById(id: number): Promise<void> {
    await this.db
      .deleteFrom('brews')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total brews records
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('brews')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a brew exists by id
   */
  async exists(id: number): Promise<boolean> {
    const result = await this.db
      .selectFrom('brews')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find brews with pagination
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<BrewsSelect[]> {
    return await this.db
      .selectFrom('brews')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple brews records
   */
  async createMany(data: Omit<BrewsInsert, 'id' | 'created_at'>[]): Promise<BrewsSelect[]> {
    return await this.db
      .insertInto('brews')
      .values(data)
      .returningAll()
      .execute();
  }
}