'use server'
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"
import { DB } from "./db"


 const  dialect =  new PostgresDialect({
    
    pool: new Pool({
      host: 'localhost',
      database: 'postgres',
      password: 'pgpass',
      user: 'pguser',
    }),
  })
export const db = new Kysely<DB>({ dialect })