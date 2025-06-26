import { Database } from '../db.d';
import { Kysely } from 'kysely';

export abstract class BaseRepository<TTable extends keyof Database> {
  constructor(
    protected db: Kysely<Database>,
    protected tableName: TTable
  ) {}

  async findById(id: number) {
    return await this.db
      .selectFrom(this.tableName)
      .where('id' as any, '=', id)
      .selectAll()
      .executeTakeFirst();
  }

  async findAll() {
    return await this.db
      .selectFrom(this.tableName)
      .selectAll()
      .execute();
  }

  async count(): Promise<number> {
    const result = await this.db
      .selectFrom(this.tableName)
      .select(this.db.fn.count('id').as('count'))
      .executeTakeFirst();
    
    return Number(result?.count || 0);
  }

  async exists(id: number): Promise<boolean> {
    const result = await this.db
      .selectFrom(this.tableName)
      .where('id' as any, '=', id)
      .select('id')
      .executeTakeFirst();
    
    return !!result;
  }
}
