import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import type { DB } from '../app/lib/db.d'

// Extended test DB interface that includes extra test columns
export interface TestDB extends DB {
  beans: DB['beans'] & {
    roast_level: string | null
  }
  methods: DB['methods'] & {
    description: string | null
  }
}

// Create in-memory SQLite database for testing
export function createTestDatabase(): Kysely<TestDB> {
  const db = new Database(':memory:')
  
  return new Kysely<TestDB>({
    dialect: new SqliteDialect({
      database: db,
    }),
  })
}

// Setup test database with schema
export async function setupTestDatabase(db: Kysely<TestDB>) {
  // Create tables (you'd run your actual migration scripts here)
  await db.schema
    .createTable('beans')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('roster', 'text')
    .addColumn('rostery', 'text')
    .addColumn('roast_level', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP'))
    .execute()

  await db.schema
    .createTable('methods')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .execute()

  await db.schema
    .createTable('grinders')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('min_setting', 'integer')
    .addColumn('max_setting', 'integer')
    .execute()

  await db.schema
    .createTable('brews')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('bean_id', 'integer', (col) => col.references('beans.id').notNull())
    .addColumn('method_id', 'integer', (col) => col.references('methods.id').notNull())
    .addColumn('grinder_id', 'integer', (col) => col.references('grinders.id').notNull())
    .addColumn('dose', 'real', (col) => col.notNull())
    .addColumn('water', 'real', (col) => col.notNull())
    .addColumn('grind', 'integer', (col) => col.notNull())
    .addColumn('ratio', 'real', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.defaultTo('CURRENT_TIMESTAMP'))
    .execute()

  // Insert test data
  await db.insertInto('beans').values([
    { id: 1, name: 'Ethiopian Sidamo', roster: 'Ethiopia', rostery: 'Medium', roast_level: 'Medium' },
    { id: 2, name: 'Colombian Supremo', roster: 'Colombia', rostery: 'Medium-Dark', roast_level: 'Medium-Dark' },
  ]).execute()

  await db.insertInto('methods').values([
    { id: 1, name: 'Pour Over V60', description: 'Japanese pour over method' },
    { id: 2, name: 'French Press', description: 'Immersion brewing method' },
  ]).execute()

  await db.insertInto('grinders').values([
    { id: 1, name: 'Baratza Encore', min_setting: 1, max_setting: 40 },
    { id: 2, name: 'Hario Mini Mill', min_setting: 1, max_setting: 20 },
  ]).execute()
}

export async function cleanupTestDatabase(db: Kysely<TestDB>) {
  await db.destroy()
}
