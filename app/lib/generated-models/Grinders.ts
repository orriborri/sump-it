import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type GrindersSelect = Selectable<DB['grinders']>;
export type GrindersInsert = Insertable<DB['grinders']>;
export type GrindersUpdate = Updateable<DB['grinders']>;

/**
 * Grinders Model - Provides CRUD operations for the grinders table
 */
export class GrindersModel {
  constructor(private db: Kysely<DB>) {}

  /**
   * Create a new grinder record
   */
  async create(data: Omit<GrindersInsert, 'id' | 'created_at'>): Promise<GrindersSelect | undefined> {
    return await this.db
      .insertInto('grinders')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a grinder by id
   */
  async findById(id: number): Promise<GrindersSelect | undefined> {
    return await this.db
      .selectFrom('grinders')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all grinders records
   */
  async findAll(): Promise<GrindersSelect[]> {
    return await this.db
      .selectFrom('grinders')
      .selectAll()
      .execute();
  }

  /**
   * Update a grinder by id
   */
  async updateById(
    id: number, 
    data: GrindersUpdate
  ): Promise<GrindersSelect | undefined> {
    return await this.db
      .updateTable('grinders')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a grinder by id
   */
  async deleteById(id: number): Promise<void> {
    await this.db
      .deleteFrom('grinders')
      .where('id', '=', id)
      .execute();
  }

  /**
   * Count total grinders records
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('grinders')
      .select(({ fn }) => fn.count<number>('id').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a grinder exists by id
   */
  async exists(id: number): Promise<boolean> {
    const result = await this.db
      .selectFrom('grinders')
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find grinders with pagination
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<GrindersSelect[]> {
    return await this.db
      .selectFrom('grinders')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple grinders records
   */
  async createMany(data: Omit<GrindersInsert, 'id' | 'created_at'>[]): Promise<GrindersSelect[]> {
    return await this.db
      .insertInto('grinders')
      .values(data)
      .returningAll()
      .execute();
  }
}