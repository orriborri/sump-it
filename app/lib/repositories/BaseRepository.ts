import { DB } from '../db.d'
import { Kysely, Selectable } from 'kysely'

/**
 * Abstract base repository providing common CRUD operations for any database table.
 * Subclasses specify the target table via the generic type parameter.
 * Uses type casting to work around complex Kysely generic constraints while
 * maintaining type safety at the public API level.
 * @template TTable - A key of the DB interface representing the target table
 */
export abstract class BaseRepository<TTable extends keyof DB> {
  /**
   * Creates a new BaseRepository instance bound to a specific database table.
   * @param _db - The Kysely database instance for executing queries
   * @param _tableName - The name of the database table this repository operates on
   */
  constructor(
    protected _db: Kysely<DB>,
    protected _tableName: TTable
  ) {
    // Constructor parameters are used by subclasses
  }

  /**
   * Finds a single record by its numeric ID.
   * @param id - The primary key ID of the record to find
   * @returns The matching record or undefined if not found
   */
  async findById(id: number): Promise<Selectable<DB[TTable]> | undefined> {
    return (await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst()) as Selectable<DB[TTable]> | undefined
  }

  /**
   * Retrieves all records from the table.
   * @returns An array of all records in the table
   */
  async findAll(): Promise<Selectable<DB[TTable]>[]> {
    return (await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .selectAll()
      .execute()) as Selectable<DB[TTable]>[]
  }

  /**
   * Counts the total number of records in the table.
   * @returns The total record count
   */
  async count(): Promise<number> {
    const result = await (
      this._db as unknown as Kysely<Record<string, Record<string, unknown>>>
    )
      .selectFrom(this._tableName as string)
      .select(this._db.fn.count('id').as('count'))
      .executeTakeFirst()

    return Number(result?.count || 0)
  }

  /**
   * Checks whether a record with the given ID exists in the table.
   * @param id - The primary key ID to check for existence
   * @returns True if a record with the given ID exists, false otherwise
   */
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
