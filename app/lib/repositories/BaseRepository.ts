import { DB } from '../db.d'
import { Kysely } from 'kysely'

// BaseRepository is temporarily disabled due to complex Kysely typing issues
// Each repository will implement its own methods for now

export abstract class BaseRepository<TTable extends keyof DB> {
  constructor(
    protected _db: Kysely<DB>,
    protected _tableName: TTable
  ) {
    // Constructor parameters are used by subclasses
  }

  // Simplified implementations that bypass type issues
  async findById(id: number): Promise<any> {
    return await (this._db as any)
      .selectFrom(this._tableName)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()
  }

  async findAll(): Promise<any[]> {
    return await (this._db as any)
      .selectFrom(this._tableName)
      .selectAll()
      .execute()
  }

  async count(): Promise<number> {
    const result = await (this._db as any)
      .selectFrom(this._tableName)
      .select(this._db.fn.count('id').as('count'))
      .executeTakeFirst()

    return Number(result?.count || 0)
  }

  async exists(id: number): Promise<boolean> {
    const result = await (this._db as any)
      .selectFrom(this._tableName)
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst()

    return !!result
  }
}
