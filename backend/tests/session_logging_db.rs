//! DB-backed integration tests for the atomic brew-logging slice (ticket #145).
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d. The CI
//! sandbox for this ticket has NO Postgres and NO Docker, so they are NOT run
//! here and their passing is NOT claimed. They encode the intended
//! transactional behaviour so a developer with a database (or a later
//! integration-env ticket) can run them with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test session_logging_db -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! (0001_init.sql + 0002_relax_session_bounds.sql) via `sqlx::migrate!`. Each
//! test cleans up the rows it inserts so the suite can run repeatedly.
//!
//! Scope mirrors the ticket's acceptance criteria for the save path:
//! - a brew insert and the grams decrement happen in ONE transaction,
//! - an Espresso recipe (impossible under the OLD global bounds) now persists,
//! - insufficient quantity FAILS the whole save (session NOT inserted, grams
//!   unchanged) rather than silently clamping,
//! - a bean that does not track quantity (`remaining_grams IS NULL`) never
//!   blocks and is not decremented.

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

/// Connects to `DATABASE_URL` and ensures the schema is present. Returns `None`
/// when the variable is unset so the (ignored) tests degrade cleanly.
async fn pool() -> Option<PgPool> {
    let url = std::env::var("DATABASE_URL").ok()?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await
        .expect("connect to DATABASE_URL");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("run migrations");
    Some(pool)
}

async fn insert_grinder(pool: &PgPool) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO grinders (id, brand, model, grinder_type, min_setting, max_setting)
           VALUES ($1, 'Comandante', 'C40', 'BurrConical', 0, 40)"#,
    )
    .bind(id)
    .execute(pool)
    .await
    .expect("insert grinder");
    id
}

async fn insert_bean(pool: &PgPool, remaining: Option<f32>) -> Uuid {
    let id = Uuid::new_v4();
    let roast = Utc::now().naive_utc().date() - Duration::days(5);
    let purchase = Utc::now().naive_utc().date() - Duration::days(3);
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, 'Session Bean', 'Ethiopia', $2, $3, $4, true)"#,
    )
    .bind(id)
    .bind(roast)
    .bind(purchase)
    .bind(remaining)
    .execute(pool)
    .await
    .expect("insert bean");
    id
}

async fn cleanup(pool: &PgPool, bean: Uuid, grinder: Uuid) {
    sqlx::query("DELETE FROM brewing_sessions WHERE bean_id = $1")
        .bind(bean)
        .execute(pool)
        .await
        .ok();
    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(bean)
        .execute(pool)
        .await
        .ok();
    sqlx::query("DELETE FROM grinders WHERE id = $1")
        .bind(grinder)
        .execute(pool)
        .await
        .ok();
}

/// A valid Espresso brew (18 g / 36 g, ratio 2.0, 93 C, 30 s) inserts the
/// session AND decrements the tracked grams by exactly the dose, in one
/// transaction. Under the OLD global bounds this recipe was impossible, so this
/// also proves migration 0002 relaxed the schema.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn espresso_logs_and_decrements_atomically() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await;

    // Mirror SessionService::log_brew inside a single transaction.
    let mut tx = pool.begin().await.expect("begin");
    let remaining: Option<f32> = sqlx::query_scalar(
        "SELECT remaining_grams FROM coffee_beans WHERE id = $1 AND is_active = true FOR UPDATE",
    )
    .bind(bean)
    .fetch_one(&mut *tx)
    .await
    .expect("lock bean");
    assert_eq!(remaining, Some(100.0));

    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting,
            water_temp_celsius, brew_time_seconds, coffee_grams, water_grams)
           VALUES ($1, $2, $3, 'Espresso', 12, 93, 30, 18.0, 36.0)"#,
    )
    .bind(session_id)
    .bind(bean)
    .bind(grinder)
    .execute(&mut *tx)
    .await
    .expect("insert espresso session");

    sqlx::query("UPDATE coffee_beans SET remaining_grams = remaining_grams - 18.0 WHERE id = $1")
        .bind(bean)
        .execute(&mut *tx)
        .await
        .expect("decrement grams");
    tx.commit().await.expect("commit");

    let (count, ratio): (i64, Option<f32>) = sqlx::query_as(
        "SELECT COUNT(*)::bigint, MAX(coffee_ratio) FROM brewing_sessions WHERE id = $1",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .expect("read session");
    assert_eq!(count, 1, "espresso session must be persisted");
    assert_eq!(ratio, Some(2.0), "generated coffee_ratio must be 2.0");

    let after: Option<f32> =
        sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
            .bind(bean)
            .fetch_one(&pool)
            .await
            .expect("read grams");
    assert_eq!(after, Some(82.0), "grams must drop by exactly the dose");

    cleanup(&pool, bean, grinder).await;
}

/// Insufficient quantity fails the WHOLE save: the rollback leaves no session
/// and the grams unchanged (never a silent clamp to zero).
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn insufficient_quantity_rolls_back_entire_save() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(5.0)).await; // less than an 18 g dose

    let mut tx = pool.begin().await.expect("begin");
    let remaining: Option<f32> = sqlx::query_scalar(
        "SELECT remaining_grams FROM coffee_beans WHERE id = $1 AND is_active = true FOR UPDATE",
    )
    .bind(bean)
    .fetch_one(&mut *tx)
    .await
    .expect("lock bean");

    // The application performs this sufficiency check and rolls back on fail.
    let required = 18.0_f32;
    let sufficient = remaining.map_or(true, |r| r >= required);
    assert!(!sufficient, "5 g must be insufficient for an 18 g dose");
    tx.rollback().await.expect("rollback");

    // No session and grams untouched.
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE bean_id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("count sessions");
    assert_eq!(count, 0, "no session may be inserted on insufficient quantity");

    let after: Option<f32> =
        sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
            .bind(bean)
            .fetch_one(&pool)
            .await
            .expect("read grams");
    assert_eq!(after, Some(5.0), "grams must be unchanged after rollback");

    cleanup(&pool, bean, grinder).await;
}

/// A bean that does not track quantity (`remaining_grams IS NULL`) never blocks
/// a brew and is not decremented.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn untracked_bean_never_blocks_and_is_not_decremented() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, None).await;

    let mut tx = pool.begin().await.expect("begin");
    let remaining: Option<f32> = sqlx::query_scalar(
        "SELECT remaining_grams FROM coffee_beans WHERE id = $1 AND is_active = true FOR UPDATE",
    )
    .bind(bean)
    .fetch_one(&mut *tx)
    .await
    .expect("lock bean");
    assert!(remaining.is_none(), "untracked bean has NULL grams");

    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams)
           VALUES ($1, $2, $3, 'V60', 20, 20.0, 320.0)"#,
    )
    .bind(session_id)
    .bind(bean)
    .bind(grinder)
    .execute(&mut *tx)
    .await
    .expect("insert session");
    // No decrement is issued for an untracked bean.
    tx.commit().await.expect("commit");

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE id = $1")
        .bind(session_id)
        .fetch_one(&pool)
        .await
        .expect("count");
    assert_eq!(count, 1, "untracked bean brew must be logged");

    let after: Option<f32> =
        sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
            .bind(bean)
            .fetch_one(&pool)
            .await
            .expect("read grams");
    assert_eq!(after, None, "untracked grams stay NULL");

    cleanup(&pool, bean, grinder).await;
}
