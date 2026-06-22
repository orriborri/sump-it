import { DB } from '../db.d'
import { Kysely, Selectable } from 'kysely'

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
  async findById(id: number): Promise<Selectable<DB[TTable]> | undefined> {
    return (await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()) as Selectable<DB[TTable]> | undefined
  }

  async findAll(): Promise<Selectable<DB[TTable]>[]> {
    return (await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .selectAll()
      .execute()) as Selectable<DB[TTable]>[]
  }

  async count(): Promise<number> {
    const result = await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .select(this._db.fn.count('id').as('count'))
      .executeTakeFirst()

    return Number(result?.count || 0)
  }

  async exists(id: number): Promise<boolean> {
    const result = await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .where('id', '=', id)
      .select('id')
      .executeTakeFirst()

    return !!result
  }
}
