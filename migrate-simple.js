import pg from 'pg'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

const { Pool } = pg

async function runMigrations() {
  console.log('Running database migrations...')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.POSTGRES_USER || 'pguser'}:${process.env.POSTGRES_PASSWORD || 'pgpass'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE || 'postgres'}`
  })

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kysely_migration (
        name VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Check if roast_level column exists
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'beans' AND column_name = 'roast_level'
    `)

    if (result.rows.length === 0) {
      console.log('Adding roast_level column to beans table...')
      await pool.query('ALTER TABLE beans ADD COLUMN roast_level VARCHAR(50)')
      
      // Mark migration as completed
      await pool.query(`
        INSERT INTO kysely_migration (name) 
        VALUES ('003_add_roast_level_to_beans') 
        ON CONFLICT (name) DO NOTHING
      `)
      
      console.log('Migration completed successfully')
    } else {
      console.log('roast_level column already exists, skipping migration')
    }

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigrations()
