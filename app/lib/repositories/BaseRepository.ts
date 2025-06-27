import { DB } from '../db.d'
import { Kysely } from 'kysely'

// BaseRepository is temporarily disabled due to complex Kysely typing issues
// Each repository will implement its own methods for now

export abstract class BaseRepository<TTable extends keyof DB> {
  constructor(
    protected db: Kysely<DB>, // eslint-disable-line no-unused-vars
    protected tableName: TTable // eslint-disable-line no-unused-vars
  ) {}

  // Simplified implementations that bypass type issues
  async findById(id: number): Promise<any> {
    return await (this.db as any)
      .selectFrom(this.tableName)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()
  }

  async findAll(): Promise<any[]> {
    return await (this.db as any)
      .selectFrom(this.tableName)
      .selectAll()
      .execute()
  }

  async count(): Promise<number> {
    const result = await (this.db as any)
      .selectFrom(this.tableName)
      .select(this.db.fn.count('id').as('count'))
      .executeTakeFirst()

    return Number(result?.count || 0)
  }

  async exists(id: number): Promise<boolean> {
    const result = await (this.db as any)
      .selectFrom(this.tableName)
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst()

    return !!result
  }
}
