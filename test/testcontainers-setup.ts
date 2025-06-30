// Alternative approach using testcontainers for PostgreSQL
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

let container: PostgreSqlContainer
let testDb: Kysely<any>

export async function setupTestContainer() {
  // Start PostgreSQL container
  container = await new PostgreSqlContainer()
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start()

  // Create Kysely instance
  const pool = new Pool({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  })

  testDb = new Kysely({
    dialect: new PostgresDialect({ pool }),
  })

  // Run migrations
  await runMigrations(testDb)
  
  return testDb
}

export async function teardownTestContainer() {
  if (testDb) {
    await testDb.destroy()
  }
  if (container) {
    await container.stop()
  }
}

async function runMigrations(db: Kysely<any>) {
  // Run your actual migration files here
  // This ensures tests use the same schema as production
}
