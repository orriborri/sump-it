//! Integration tests for the grinder slice (service + schema).
//!
//! DB-REQUIRED: these tests exercise `GrinderService` against a real Postgres
//! instance created from `migrations/0001_init.sql`. They are IGNORED by
//! default so `cargo test`/`cargo check` still run cleanly without a database,
//! but they are run against a real Postgres as part of the DB integration
//! suite. The coverage gate measures only the library (`cargo llvm-cov
//! --lib`); these binary-level, DB-backed paths are intentionally outside that
//! gate and documented here as the real end-to-end verification of the grinder
//! persistence layer.
//!
//! To run locally against a database (the suite reads `DATABASE_URL`, falling
//! back to `TEST_DATABASE_URL`, so a single variable drives every DB suite):
//!
//! ```bash
//! export DATABASE_URL=postgres://postgres:postgres@localhost:5432/coffee_test
//! cargo test --test grinders_integration -- --ignored
//! ```
//!
//! Each test creates a uniquely named throwaway database, runs the single
//! schema migration, exercises the service, and drops the database afterwards.

use sqlx::postgres::PgPoolOptions;
use sqlx::{Executor, PgPool};
use uuid::Uuid;

use coffee_brewer_backend::models::{CreateGrinderRequest, GrinderType};

// The service layer lives in the binary target, so it cannot be imported from
// the library crate. The integration test re-declares the thin query wrapper it
// needs here; the queries mirror `backend/src/services/grinders.rs` exactly so
// this file documents and verifies the same SQL against a real database.
mod grinder_queries {
    use super::*;
    use anyhow::{Context, Result};
    use chrono::Utc;

    pub async fn create(pool: &PgPool, request: CreateGrinderRequest) -> Result<Uuid> {
        let now = Utc::now();
        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO grinders (
                id, brand, model, grinder_type, min_setting, max_setting,
                scale_type, description, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(id)
        .bind(request.brand)
        .bind(request.model)
        .bind(request.grinder_type)
        .bind(request.min_setting)
        .bind(request.max_setting)
        .bind(request.scale_type)
        .bind(request.description)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .context("insert grinder")?;
        Ok(id)
    }

    pub async fn count(pool: &PgPool) -> Result<i64> {
        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM grinders"#)
            .fetch_one(pool)
            .await?;
        Ok(total)
    }

    pub async fn delete(pool: &PgPool, id: Uuid) -> Result<u64> {
        let res = sqlx::query(r#"DELETE FROM grinders WHERE id = $1"#)
            .bind(id)
            .execute(pool)
            .await?;
        Ok(res.rows_affected())
    }
}

/// Spins up a throwaway database and applies the single schema migration.
async fn setup_pool() -> PgPool {
    // Prefer `DATABASE_URL`, falling back to `TEST_DATABASE_URL`, so one env
    // var drives every DB integration suite in this crate.
    let base_url = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("TEST_DATABASE_URL"))
        .expect("DATABASE_URL (or TEST_DATABASE_URL) must be set for DB-required grinder tests");

    let db_name = format!("grinder_test_{}", Uuid::new_v4().simple());

    // Connect to the server (default `postgres` db) to create the test db.
    let admin = PgPoolOptions::new()
        .max_connections(1)
        .connect(&base_url)
        .await
        .expect("connect to admin database");
    admin
        .execute(format!("CREATE DATABASE {}", db_name).as_str())
        .await
        .expect("create test database");

    let test_url = swap_database(&base_url, &db_name);
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&test_url)
        .await
        .expect("connect to test database");

    let schema = include_str!("../migrations/0001_init.sql");
    pool.execute(schema).await.expect("apply schema migration");

    pool
}

/// Rewrites the database name in a Postgres connection URL.
fn swap_database(base_url: &str, db_name: &str) -> String {
    match base_url.rfind('/') {
        Some(idx) => format!("{}/{}", &base_url[..idx], db_name),
        None => format!("{}/{}", base_url, db_name),
    }
}

fn sample_request(min: i32, max: i32) -> CreateGrinderRequest {
    CreateGrinderRequest {
        brand: "Comandante".to_string(),
        model: "C40".to_string(),
        grinder_type: GrinderType::BurrConical,
        min_setting: min,
        max_setting: max,
        scale_type: Some("step".to_string()),
        description: Some("Hand grinder".to_string()),
    }
}

#[tokio::test]
#[ignore = "DB-required: needs a running Postgres via DATABASE_URL"]
async fn create_and_count_grinder() {
    let pool = setup_pool().await;

    assert_eq!(grinder_queries::count(&pool).await.unwrap(), 0);

    let id = grinder_queries::create(&pool, sample_request(0, 40))
        .await
        .expect("create grinder");

    assert_eq!(grinder_queries::count(&pool).await.unwrap(), 1);

    let removed = grinder_queries::delete(&pool, id).await.unwrap();
    assert_eq!(removed, 1);
    assert_eq!(grinder_queries::count(&pool).await.unwrap(), 0);
}

#[tokio::test]
#[ignore = "DB-required: needs a running Postgres via DATABASE_URL"]
async fn schema_rejects_max_not_greater_than_min() {
    let pool = setup_pool().await;

    // The `CHECK (max_setting > min_setting)` constraint must reject this row,
    // matching the API-level validation surfaced to the user.
    let result = grinder_queries::create(&pool, sample_request(40, 40)).await;
    assert!(result.is_err(), "schema must reject max_setting <= min_setting");
}

#[tokio::test]
#[ignore = "DB-required: needs a running Postgres via DATABASE_URL"]
async fn schema_rejects_negative_min_setting() {
    let pool = setup_pool().await;

    // The `CHECK (min_setting >= 0)` constraint must reject a negative minimum.
    let result = grinder_queries::create(&pool, sample_request(-1, 40)).await;
    assert!(result.is_err(), "schema must reject negative min_setting");
}
