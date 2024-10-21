import { PostgresDialect } from "kysely"
import { defineConfig } from "kysely-ctl"
import { Pool } from 'pg'
import { db } from "./app/lib/database"

export default defineConfig({
  kysely: db
})