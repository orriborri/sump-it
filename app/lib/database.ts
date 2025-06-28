import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from './db.d'

// Use DATABASE_URL if available, otherwise fall back to individual env vars
const databaseUrl = process.env.DATABASE_URL

const dialect = new PostgresDialect({
  pool: databaseUrl
    ? new Pool({ connectionString: databaseUrl })
    : new Pool({
        database: process.env.POSTGRES_DATABASE || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'pgpass',
        host: process.env.POSTGRES_HOST || 'localhost',
        user: process.env.POSTGRES_USER || 'pguser',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        max: 10,
      }),
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
  dialect,
})
