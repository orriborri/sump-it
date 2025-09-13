import { fileURLToPath } from 'url'
import * as path from 'path'
import { promises as fs } from 'fs'
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from 'kysely'
import pg from 'pg'

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateToLatest() {
  console.log('Starting migration process...')

  const databaseUrl = process.env.DATABASE_URL

  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: databaseUrl
        ? new Pool({ connectionString: databaseUrl })
        : new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            database: process.env.POSTGRES_DATABASE || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'pgpass',
            user: process.env.POSTGRES_USER || 'pguser',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
          }),
    }),
  })

  console.log('Database connection established')

  const migrationFolder = path.join(__dirname, 'migrations')

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  })

  console.log('Migrator created')

  try {
    console.log('Running migrations...')
    const { error, results } = await migrator.migrateToLatest()

    results?.forEach(it => {
      if (it.status === 'Success') {
        console.log(`Migration "${it.migrationName}" was executed successfully`)
      } else if (it.status === 'Error') {
        console.error(`Failed to execute migration "${it.migrationName}"`)
      }
    })

    if (error) {
      console.error(`Failed to migrate: ${error}`)
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

migrateToLatest().catch(err => {
  console.error('Unhandled error during migration:', err)
  process.exit(1)
})
