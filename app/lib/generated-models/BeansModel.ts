import { Kysely, Selectable } from 'kysely';
import { DB } from '../db';
import { Updateable } from 'kysely';

export class beansModel {
  constructor(private db: Kysely<DB>) {}

  async create(data: Omit<DB['beans'], 'id' | 'created_at'>) {
    return this.db.insertInto('beans')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }


  /**
   * Get a bean by id, selecting only specified fields.
   * @param id The bean id
   * @param fields Optional array of fields to select
   */
  async getById(id: number, fields?: (keyof DB['beans'])[]) {
    const query = this.db.selectFrom('beans')
      .where('id', '=', id);
    if (fields && fields.length > 0) {
      // Type assertion is needed for dynamic fields
      return query.select(fields as any).executeTakeFirst();
    } else {
      return query.selectAll().executeTakeFirst();
    }
  }

  async update(id: number, data: Updateable<DB['beans']>) {
    return this.db.updateTable('beans')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: number) {
    await this.db.deleteFrom('beans')
      .where('id', '=', id)
      .execute();
  }

  async list(...fields: (keyof DB['beans'])[]) {
    const query = this.db.selectFrom('beans');
    if (fields.length > 0) {
      return query.select(fields).execute();
    } else {
      return query.selectAll().execute();
    }
  }

  async upsert(
    data: import('kysely').Insertable<DB['beans']>,
    conflictColumn: keyof DB['beans'] = 'id'
  ) {
    return this.db
      .insertInto('beans')
      .values(data)
      .onConflict((oc) =>
        oc.column(conflictColumn).doUpdateSet((eb) => {
          const updates: Partial<Updateable<DB['beans']>> = {};
          for (const key in data) {
            if (key !== conflictColumn) {
            updates[key as keyof import('kysely').Updateable<DB['beans']>] = eb.ref(key as keyof DB['beans']) as any;
            }
          }
          return updates;
        })
      )
      .returningAll()
      .executeTakeFirst();
  }
}