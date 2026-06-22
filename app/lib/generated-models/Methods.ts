import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type MethodsSelect = Selectable<DB['methods']>;
export type MethodsInsert = Insertable<DB['methods']>;
export type MethodsUpdate = Updateable<DB['methods']>;

/**
 * Methods Model - Provides CRUD operations for the methods table
 */
export class MethodsModel {
  /**
   * Creates a new MethodsModel instance for querying the methods table.
   * @param _db - The Kysely database instance to use for queries
   */
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new method record
   * @param data - The method data to insert (excludes auto-generated id and created_at)
   * @returns The newly created method record, or undefined if the insert failed
   */
  async create(data: Omit<MethodsInsert, 'id' | 'created_at'>): Promise<MethodsSelect | undefined> {
    return await this._db
      .insertInto('methods')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a method by id
   * @param id - The primary key of the method to find
   * @returns The matching method record, or undefined if not found
   */
  async findById(id: number): Promise<MethodsSelect | undefined> {
    return await this._db
      .selectFrom('methods')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all methods records
   * @returns An array of all method records in the table
   */
  async findAll(): Promise<MethodsSelect[]> {
    return await this._db
      .selectFrom('methods')
      .selectAll()
      .execute();
  }

  /**
   * Update a method by id
   * @param id - The primary key of the method to update
   * @param data - The fields to update on the method record
   * @returns The updated method record, or undefined if not found
   */
  async updateById(
    id: number, 
    data: MethodsUpdate
  ): Promise<MethodsSelect | undefined> {
    return await this._db
      .updateTable('methods')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a method by id
   * @param id - The primary key of the method to delete
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('methods')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total methods records
   * @returns The total number of method records
   */
  async count(): Promise<number> {
    const result = await this._db
      .selectFrom('methods')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a method exists by id
   * @param id - The primary key to check
   * @returns True if a method with the given id exists
   */
  async exists(id: number): Promise<boolean> {
    const result = await this._db
      .selectFrom('methods')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find methods with pagination
   * @param limit - Maximum number of records to return (default: 10)
   * @param offset - Number of records to skip (default: 0)
   * @returns An array of method records within the specified page
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<MethodsSelect[]> {
    return await this._db
      .selectFrom('methods')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple methods records
   * @param data - Array of method data to insert (excludes auto-generated id and created_at)
   * @returns An array of the newly created method records
   */
  async createMany(data: Omit<MethodsInsert, 'id' | 'created_at'>[]): Promise<MethodsSelect[]> {
    return await this._db
      .insertInto('methods')
      .values(data)
      .returningAll()
      .execute();
  }
}