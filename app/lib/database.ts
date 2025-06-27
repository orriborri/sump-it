import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from './db.d'

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

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
  dialect,
})
