import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type BeansSelect = Selectable<DB['beans']>;
export type BeansInsert = Insertable<DB['beans']>;
export type BeansUpdate = Updateable<DB['beans']>;

/**
 * Beans Model - Provides CRUD operations for the beans table
 */
export class BeansModel {
  /**
   * Creates a new BeansModel instance for querying the beans table.
   * @param _db - The Kysely database instance to use for queries
   */
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new bean record
   * @param data - The bean data to insert (excludes auto-generated id and created_at)
   * @returns The newly created bean record
   */
  async create(data: Omit<BeansInsert, 'id' | 'created_at'>): Promise<BeansSelect | undefined> {
    return await this._db
      .insertInto('beans')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a bean by id
   * @param id - The primary key of the bean to find
   * @returns The matching bean record, or undefined if not found
   */
  async findById(id: number): Promise<BeansSelect | undefined> {
    return await this._db
      .selectFrom('beans')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all beans records
   * @returns An array of all bean records in the table
   */
  async findAll(): Promise<BeansSelect[]> {
    return await this._db
      .selectFrom('beans')
      .selectAll()
      .execute();
  }

  /**
   * Update a bean by id
   * @param id - The primary key of the bean to update
   * @param data - The fields to update on the bean record
   * @returns The updated bean record, or undefined if not found
   */
  async updateById(
    id: number, 
    data: BeansUpdate
  ): Promise<BeansSelect | undefined> {
    return await this._db
      .updateTable('beans')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a bean by id
   * @param id - The primary key of the bean to delete
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('beans')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total beans records
   * @returns The total number of bean records
   */
  async count(): Promise<number> {
    const result = await this._db
      .selectFrom('beans')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a bean exists by id
   * @param id - The primary key to check
   * @returns True if a bean with the given id exists
   */
  async exists(id: number): Promise<boolean> {
    const result = await this._db
      .selectFrom('beans')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find beans with pagination
   * @param limit - Maximum number of records to return (default: 10)
   * @param offset - Number of records to skip (default: 0)
   * @returns An array of bean records within the specified page
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<BeansSelect[]> {
    return await this._db
      .selectFrom('beans')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple beans records
   * @param data - Array of bean data to insert (excludes auto-generated id and created_at)
   * @returns An array of the newly created bean records
   */
  async createMany(data: Omit<BeansInsert, 'id' | 'created_at'>[]): Promise<BeansSelect[]> {
    return await this._db
      .insertInto('beans')
      .values(data)
      .returningAll()
      .execute();
  }
}