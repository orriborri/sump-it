import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type GrindersSelect = Selectable<DB['grinders']>;
export type GrindersInsert = Insertable<DB['grinders']>;
export type GrindersUpdate = Updateable<DB['grinders']>;

/**
 * Grinders Model - Provides CRUD operations for the grinders table
 */
export class GrindersModel {
  /**
   * Creates a new GrindersModel instance for querying the grinders table.
   * @param _db - The Kysely database instance to use for queries
   */
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new grinder record
   * @param data - The grinder data to insert (excludes auto-generated id and created_at)
   * @returns The newly created grinder record, or undefined if the insert failed
   */
  async create(data: Omit<GrindersInsert, 'id' | 'created_at'>): Promise<GrindersSelect | undefined> {
    return await this._db
      .insertInto('grinders')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a grinder by id
   * @param id - The primary key of the grinder to find
   * @returns The matching grinder record, or undefined if not found
   */
  async findById(id: number): Promise<GrindersSelect | undefined> {
    return await this._db
      .selectFrom('grinders')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all grinders records
   * @returns An array of all grinder records in the table
   */
  async findAll(): Promise<GrindersSelect[]> {
    return await this._db
      .selectFrom('grinders')
      .selectAll()
      .execute();
  }

  /**
   * Update a grinder by id
   * @param id - The primary key of the grinder to update
   * @param data - The fields to update on the grinder record
   * @returns The updated grinder record, or undefined if not found
   */
  async updateById(
    id: number, 
    data: GrindersUpdate
  ): Promise<GrindersSelect | undefined> {
    return await this._db
      .updateTable('grinders')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a grinder by id
   * @param id - The primary key of the grinder to delete
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('grinders')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total grinders records
   * @returns The total number of grinder records
   */
  async count(): Promise<number> {
    const result = await this._db
      .selectFrom('grinders')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a grinder exists by id
   * @param id - The primary key to check
   * @returns True if a grinder with the given id exists
   */
  async exists(id: number): Promise<boolean> {
    const result = await this._db
      .selectFrom('grinders')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find grinders with pagination
   * @param limit - Maximum number of records to return (default: 10)
   * @param offset - Number of records to skip (default: 0)
   * @returns An array of grinder records within the specified page
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<GrindersSelect[]> {
    return await this._db
      .selectFrom('grinders')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple grinders records
   * @param data - Array of grinder data to insert (excludes auto-generated id and created_at)
   * @returns An array of the newly created grinder records
   */
  async createMany(data: Omit<GrindersInsert, 'id' | 'created_at'>[]): Promise<GrindersSelect[]> {
    return await this._db
      .insertInto('grinders')
      .values(data)
      .returningAll()
      .execute();
  }
}