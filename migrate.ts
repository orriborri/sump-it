import { fileURLToPath } from 'url'
import * as path from 'path'
import { promises as fs } from 'fs'
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from 'kysely'

// Import pg as a CommonJS module in ESM
import pg from 'pg'
const { Pool } = pg

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateToLatest() {
  console.log('Starting migration process...')

  // Create database connection
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: 'localhost',
        database: 'postgres',
        password: 'pgpass',
        user: 'pguser',
      }),
    }),
  })

  console.log('Database connection established')

  // Create migrator
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  })

  console.log('Migrator created')

  try {
    // Run migrations
    console.log('Running migrations...')
    const { error, results } = await migrator.migrateToLatest()

    // Log results
    results?.forEach(it => {
      if (it.status === 'Success') {
        console.log(`Migration "${it.migrationName}" was executed successfully`)
      } else if (it.status === 'Error') {
        console.error(`Failed to execute migration "${it.migrationName}"`)
      }
    })

    // Handle errors
    if (error) {
      console.error('Failed to migrate:')
      console.error(error)
      process.exit(1)
    }

    console.log('Migration completed successfully')
  } catch (err) {
    console.error('Migration error:', err)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

// Run the migration
migrateToLatest().catch(err => {
  console.error('Unhandled error during migration:', err)
  process.exit(1)
})
