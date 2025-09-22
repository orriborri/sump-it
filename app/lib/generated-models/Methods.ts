import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type MethodsSelect = Selectable<DB['methods']>;
export type MethodsInsert = Insertable<DB['methods']>;
export type MethodsUpdate = Updateable<DB['methods']>;

/**
 * Methods Model - Provides CRUD operations for the methods table
 */
export class MethodsModel {
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new method record
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
   */
  async findAll(): Promise<MethodsSelect[]> {
    return await this._db
      .selectFrom('methods')
      .selectAll()
      .execute();
  }

  /**
   * Update a method by id
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
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('methods')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total methods records
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
   */
  async createMany(data: Omit<MethodsInsert, 'id' | 'created_at'>[]): Promise<MethodsSelect[]> {
    return await this._db
      .insertInto('methods')
      .values(data)
      .returningAll()
      .execute();
  }
}