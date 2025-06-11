// generate-models.ts
import { Project, InterfaceDeclaration } from 'ts-morph';
import fs from 'fs/promises';
import path from 'path';

const dbInterfaceFile = './app/lib/db.d.ts';
const dbFile = '../db'; // Adjust this path as necessary to point to your DB module
const outputDir = './app/lib/generated-models';

async function generate() {
  const project = new Project();
  project.addSourceFileAtPath(dbInterfaceFile);

  const sourceFile = project.getSourceFileOrThrow(dbInterfaceFile);
  const dbInterface = sourceFile.getInterfaceOrThrow('DB');

  await fs.rmdir(outputDir, { recursive: true})
  await fs.mkdir(outputDir, { recursive: true });

  for (const prop of dbInterface.getProperties()) {
    const tableName = prop.getName();
    const className = `${capitalize(tableName)}Model`;

    const code = `
import { Kysely, Selectable } from 'kysely';
import { DB } from '../db';
import { Updateable } from 'kysely';

export class ${tableName}Model {
  constructor(private db: Kysely<DB>) {}

  async create(data: Omit<DB['${tableName}'], 'id' | 'created_at'>) {
    return this.db.insertInto('${tableName}')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }


  /**
   * Get a bean by id, selecting only specified fields.
   * @param id The bean id
   * @param fields Optional array of fields to select
   */
  async getById(id: number, fields?: (keyof DB['${tableName}'])[]) {
    const query = this.db.selectFrom('${tableName}')
      .where('id', '=', id);
    if (fields && fields.length > 0) {
      // Type assertion is needed for dynamic fields
      return query.select(fields as any).executeTakeFirst();
    } else {
      return query.selectAll().executeTakeFirst();
    }
  }

  async update(id: number, data: Updateable<DB['${tableName}']>) {
    return this.db.updateTable('${tableName}')
      .set(data)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: number) {
    await this.db.deleteFrom('${tableName}')
      .where('id', '=', id)
      .execute();
  }

  async list(...fields: (keyof DB['${tableName}'])[]) {
    const query = this.db.selectFrom('${tableName}');
    if (fields.length > 0) {
      return query.select(fields).execute();
    } else {
      return query.selectAll().execute();
    }
  }

  async upsert(
    data: import('kysely').Insertable<DB['${tableName}']>,
    conflictColumn: keyof DB['${tableName}'] = 'id'
  ) {
    return this.db
      .insertInto('${tableName}')
      .values(data)
      .onConflict((oc) =>
        oc.column(conflictColumn).doUpdateSet((eb) => {
          const updates: Partial<Updateable<DB['${tableName}']>> = {};
          for (const key in data) {
            if (key !== conflictColumn) {
            updates[key as keyof import('kysely').Updateable<DB['${tableName}']>] = eb.ref(key as keyof DB['${tableName}']) as any;
            }
          }
          return updates;
        })
      )
      .returningAll()
      .executeTakeFirst();
  }
}
    `.trim();

    await fs.writeFile(path.join(outputDir, `${className}.ts`), code);
    console.log(`✔ Generated: ${className}.ts`);
  }
}

function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}

generate().catch(console.error);
