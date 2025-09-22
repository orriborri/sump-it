import { migrateToLatest } from '../../migrate'
import { logger } from './logger'

// Track if migrations have been run to avoid running them multiple times
let migrationsRun = false
let migrationPromise: Promise<void> | null = null

/**
 * Ensures database migrations are run before the app starts serving requests.
 * This function is safe to call multiple times - it will only run migrations once.
 */
export async function ensureMigrations(): Promise<void> {
  // If migrations have already been completed, return immediately
  if (migrationsRun) {
    return
  }

  // If migrations are already in progress, wait for them to complete
  if (migrationPromise) {
    await migrationPromise
    return
  }

  // Start the migration process
  migrationPromise = (async () => {
    try {
      logger.info('Ensuring database migrations are up to date')
      const result = await migrateToLatest({
        silent: false,
        exitOnError: false,
      })

      if (!result.success) {
        throw new Error(`Migration failed: ${result.error}`)
      }

      migrationsRun = true
      logger.info('Database migrations completed successfully')
    } catch {
      logger.error('Failed to run migrations', {}, error as Error)
      // Reset the promise so migrations can be retried
      migrationPromise = null
      throw error
    }
  })()

  await migrationPromise
}
