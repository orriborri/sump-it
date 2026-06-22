import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from './db.d'

/** Type alias representing a Kysely instance typed with the application's database schema */
export type Database = Kysely<DB>

const dialect = new PostgresDialect({
  pool: new Pool({
    database: 'postgres',
    password: 'pgpass',
    host: 'localhost',
    user: 'pguser',
    port: 5432,
    max: 10,
  }),
})

/**
 * Kysely database instance configured with default local PostgreSQL connection settings.
 * Connects to localhost:5432 with a pool of up to 10 clients.
 */
export const db = new Kysely<DB>({
  dialect,
})
