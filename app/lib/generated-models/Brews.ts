import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type BrewsSelect = Selectable<DB['brews']>;
export type BrewsInsert = Insertable<DB['brews']>;
export type BrewsUpdate = Updateable<DB['brews']>;

/**
 * Brews Model - Provides CRUD operations for the brews table
 */
export class BrewsModel {
  /**
   * Creates a new BrewsModel instance for querying the brews table.
   * @param _db - The Kysely database instance to use for queries
   */
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new brew record
   * @param data - The brew data to insert (excludes auto-generated id and created_at)
   * @returns The newly created brew record, or undefined if the insert failed
   */
  async create(data: Omit<BrewsInsert, 'id' | 'created_at'>): Promise<BrewsSelect | undefined> {
    return await this._db
      .insertInto('brews')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a brew by id
   * @param id - The primary key of the brew to find
   * @returns The matching brew record, or undefined if not found
   */
  async findById(id: number): Promise<BrewsSelect | undefined> {
    return await this._db
      .selectFrom('brews')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all brews records
   * @returns An array of all brew records in the table
   */
  async findAll(): Promise<BrewsSelect[]> {
    return await this._db
      .selectFrom('brews')
      .selectAll()
      .execute();
  }

  /**
   * Update a brew by id
   * @param id - The primary key of the brew to update
   * @param data - The fields to update on the brew record
   * @returns The updated brew record, or undefined if not found
   */
  async updateById(
    id: number, 
    data: BrewsUpdate
  ): Promise<BrewsSelect | undefined> {
    return await this._db
      .updateTable('brews')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a brew by id
   * @param id - The primary key of the brew to delete
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('brews')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total brews records
   * @returns The total number of brew records
   */
  async count(): Promise<number> {
    const result = await this._db
      .selectFrom('brews')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a brew exists by id
   * @param id - The primary key to check
   * @returns True if a brew with the given id exists
   */
  async exists(id: number): Promise<boolean> {
    const result = await this._db
      .selectFrom('brews')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find brews with pagination
   * @param limit - Maximum number of records to return (default: 10)
   * @param offset - Number of records to skip (default: 0)
   * @returns An array of brew records within the specified page
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<BrewsSelect[]> {
    return await this._db
      .selectFrom('brews')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple brews records
   * @param data - Array of brew data to insert (excludes auto-generated id and created_at)
   * @returns An array of the newly created brew records
   */
  async createMany(data: Omit<BrewsInsert, 'id' | 'created_at'>[]): Promise<BrewsSelect[]> {
    return await this._db
      .insertInto('brews')
      .values(data)
      .returningAll()
      .execute();
  }
}