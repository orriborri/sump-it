import { Kysely, Selectable } from 'kysely';
import { DB } from '../db';
import { Updateable } from 'kysely';

export class methodsModel {
  constructor(private db: Kysely<DB>) {}

  async create(data: Omit<DB['methods'], 'id' | 'created_at'>) {
    return this.db.insertInto('methods')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }


  /**
   * Get a bean by id, selecting only specified fields.
   * @param id The bean id
   * @param fields Optional array of fields to select
   */
  async getById(id: number, fields?: (keyof DB['methods'])[]) {
    const query = this.db.selectFrom('methods')
      .where('id', '=', id);
    if (fields && fields.length > 0) {
      // Type assertion is needed for dynamic fields
      return query.select(fields as any).executeTakeFirst();
    } else {
      return query.selectAll().executeTakeFirst();
    }
  }

  async update(id: number, data: Updateable<DB['methods']>) {
    return this.db.updateTable('methods')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: number) {
    await this.db.deleteFrom('methods')
      .where('id', '=', id)
      .execute();
  }

  async list(...fields: (keyof DB['methods'])[]) {
    const query = this.db.selectFrom('methods');
    if (fields.length > 0) {
      return query.select(fields).execute();
    } else {
      return query.selectAll().execute();
    }
  }

  async upsert(
    data: import('kysely').Insertable<DB['methods']>,
    conflictColumn: keyof DB['methods'] = 'id'
  ) {
    return this.db
      .insertInto('methods')
      .values(data)
      .onConflict((oc) =>
        oc.column(conflictColumn).doUpdateSet((eb) => {
          const updates: Partial<Updateable<DB['methods']>> = {};
          for (const key in data) {
            if (key !== conflictColumn) {
            updates[key as keyof import('kysely').Updateable<DB['methods']>] = eb.ref(key as keyof DB['methods']) as any;
            }
          }
          return updates;
        })
      )
      .returningAll()
      .executeTakeFirst();
  }
}