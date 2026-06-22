import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from './db.d'
import { logger } from './logger'

// Use DATABASE_URL if available, otherwise fall back to individual env vars
const databaseUrl = process.env.DATABASE_URL

// Log database connection info for debugging
logger.info('Database connection check', {
  hasDatabaseUrl: !!databaseUrl,
  host: databaseUrl ? 'from_url' : process.env.POSTGRES_HOST || 'localhost',
  database: databaseUrl ? 'from_url' : process.env.POSTGRES_DATABASE || 'postgres',
  user: databaseUrl ? 'from_url' : process.env.POSTGRES_USER || 'pguser',
  port: databaseUrl ? 'from_url' : process.env.POSTGRES_PORT || '5432'
})

const dialect = new PostgresDialect({
  pool: databaseUrl
    ? new Pool({ 
        connectionString: databaseUrl,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      })
    : new Pool({
        database: process.env.POSTGRES_DATABASE || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'pgpass',
        host: process.env.POSTGRES_HOST || 'localhost',
        user: process.env.POSTGRES_USER || 'pguser',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }),
})

/**
 * Primary Kysely database instance configured with the PostgreSQL dialect.
 * Uses DATABASE_URL environment variable if available, otherwise falls back
 * to individual connection parameters (POSTGRES_HOST, POSTGRES_DATABASE, etc.).
 * The connection pool is configured with a max of 20 clients, 30s idle timeout,
 * and 2s connection timeout.
 */
export const db = new Kysely<DB>({
  dialect,
})
