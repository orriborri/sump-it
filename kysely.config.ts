import { PostgresDialect } from "kysely"
import { defineConfig } from "kysely-ctl"
import { Pool } from 'pg'
import { db } from "./app/lib/database"

/**
 * Kysely CLI configuration for database migrations.
 * Exports the shared database instance for use with kysely-ctl commands.
 */
export default defineConfig({
  kysely: db
})