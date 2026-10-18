//! Database module for the consolidated application.
//! Handles connection pooling and applies the sqlx migrations that live under
//! `backend/migrations/`, which are the single source of truth for the schema.

use sqlx::{PgPool, postgres::PgPoolOptions};
use anyhow::{Result, Context};
use tracing::info;

// coverage: process bootstrap - creates the Postgres connection pool and runs
// migrations at startup. Requires a live database and is part of wiring, so it
// is excluded per docs/coverage.md (pool creation).
#[cfg_attr(coverage_nightly, coverage(off))]
/// Initialize database connection pool and apply pending migrations.
pub async fn init_pool() -> Result<PgPool> {
    let database_url = std::env::var("DATABASE_URL")
        .context("DATABASE_URL must be set")?;

    info!("Connecting to database...");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .context("Failed to create database pool")?;

    // Apply sqlx migrations from the `migrations` directory. This is the only
    // place the schema is defined; there is no boot-time DDL anymore.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("Failed to run database migrations")?;

    info!("Database connection established and migrations applied");

    Ok(pool)
}

/// Health check for database connection.
pub async fn health_check(pool: &PgPool) -> Result<bool> {
    let result: (i64,) = sqlx::query_as("SELECT 1")
        .fetch_one(pool)
        .await
        .context("Database health check failed")?;

    Ok(result.0 == 1)
}
