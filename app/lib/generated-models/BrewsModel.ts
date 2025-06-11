import { Kysely, Selectable } from 'kysely';
import { DB } from '../db';
import { Updateable } from 'kysely';

export class brewsModel {
  constructor(private db: Kysely<DB>) {}

  async create(data: Omit<DB['brews'], 'id' | 'created_at'>) {
    return this.db.insertInto('brews')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }


  /**
   * Get a bean by id, selecting only specified fields.
   * @param id The bean id
   * @param fields Optional array of fields to select
   */
  async getById(id: number, fields?: (keyof DB['brews'])[]) {
    const query = this.db.selectFrom('brews')
      .where('id', '=', id);
    if (fields && fields.length > 0) {
      // Type assertion is needed for dynamic fields
      return query.select(fields as any).executeTakeFirst();
    } else {
      return query.selectAll().executeTakeFirst();
    }
  }

  async update(id: number, data: Updateable<DB['brews']>) {
    return this.db.updateTable('brews')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: number) {
    await this.db.deleteFrom('brews')
      .where('id', '=', id)
      .execute();
  }

  async list(...fields: (keyof DB['brews'])[]) {
    const query = this.db.selectFrom('brews');
    if (fields.length > 0) {
      return query.select(fields).execute();
    } else {
      return query.selectAll().execute();
    }
  }

  async upsert(
    data: import('kysely').Insertable<DB['brews']>,
    conflictColumn: keyof DB['brews'] = 'id'
  ) {
    return this.db
      .insertInto('brews')
      .values(data)
      .onConflict((oc) =>
        oc.column(conflictColumn).doUpdateSet((eb) => {
          const updates: Partial<Updateable<DB['brews']>> = {};
          for (const key in data) {
            if (key !== conflictColumn) {
            updates[key as keyof import('kysely').Updateable<DB['brews']>] = eb.ref(key as keyof DB['brews']) as any;
            }
          }
          return updates;
        })
      )
      .returningAll()
      .executeTakeFirst();
  }
}