import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type BeansSelect = Selectable<DB['beans']>;
export type BeansInsert = Insertable<DB['beans']>;
export type BeansUpdate = Updateable<DB['beans']>;

/**
 * Beans Model - Provides CRUD operations for the beans table
 */
export class BeansModel {
  constructor(private _db: Kysely<DB>) {}

  /**
   * Create a new bean record
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
   */
  async findAll(): Promise<BeansSelect[]> {
    return await this._db
      .selectFrom('beans')
      .selectAll()
      .execute();
  }

  /**
   * Update a bean by id
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
   */
  async deleteById(id: number): Promise<void> {
    await this._db
      .deleteFrom('beans')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total beans records
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
   */
  async createMany(data: Omit<BeansInsert, 'id' | 'created_at'>[]): Promise<BeansSelect[]> {
    return await this._db
      .insertInto('beans')
      .values(data)
      .returningAll()
      .execute();
  }
}