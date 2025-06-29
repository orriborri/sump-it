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

interface MigrationOptions {
  silent?: boolean
  exitOnError?: boolean
}

interface MigrationResult {
  success: boolean
  error?: string
}

async function migrateToLatest(
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const { silent = false, exitOnError = true } = options

  if (!silent) {
    console.log('Starting migration process...')
  }

  // Use DATABASE_URL if available, otherwise fall back to individual env vars
  const databaseUrl = process.env.DATABASE_URL

  // Create database connection
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

  if (!silent) {
    console.log('Database connection established')
  }

  // Create migrator - use dist/migrations in production, migrations/ in development
  const migrationFolder =
    process.env.NODE_ENV === 'production'
      ? path.join(__dirname, 'dist', 'migrations')
      : path.join(__dirname, 'migrations')

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  })

  if (!silent) {
    console.log('Migrator created')
  }

  try {
    // Run migrations
    if (!silent) {
      console.log('Running migrations...')
    }
    const { error, results } = await migrator.migrateToLatest()

    // Log results
    if (!silent) {
      results?.forEach(it => {
        if (it.status === 'Success') {
          console.log(
            `Migration "${it.migrationName}" was executed successfully`
          )
        } else if (it.status === 'Error') {
          console.error(`Failed to execute migration "${it.migrationName}"`)
        }
      })
    }

    // Handle errors
    if (error) {
      const errorMessage = `Failed to migrate: ${error instanceof Error ? error.message : String(error)}`
      if (!silent) {
        console.error(errorMessage)
      }
      if (exitOnError) {
        process.exit(1)
      }
      return { success: false, error: errorMessage }
    }

    if (!silent) {
      console.log('Migration completed successfully')
    }
    return { success: true }
  } catch (err) {
    const errorMessage = `Migration error: ${err instanceof Error ? err.message : err}`
    if (!silent) {
      console.error(errorMessage)
    }
    if (exitOnError) {
      process.exit(1)
    }
    return { success: false, error: errorMessage }
  } finally {
    await db.destroy()
  }
}

// Export the function for use in other modules
export { migrateToLatest }

// Run the migration when this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToLatest().catch(err => {
    console.error('Unhandled error during migration:', err)
    process.exit(1)
  })
}
