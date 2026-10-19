//! DB-backed integration tests for the atomic brew-logging slice (ticket #145).
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d so that
//! `cargo test` runs cleanly without a database. They are run against a real
//! Postgres as part of the DB integration suite and encode the intended
//! transactional behaviour. Run them (they read `DATABASE_URL`, falling back to
//! `TEST_DATABASE_URL`) with:
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
//! WHY THIS TEST CALLS THE REAL SERVICE: the production save path
//! (`SessionService::log_brew` / `duplicate` / `list_filtered`) lives in the
//! library crate (`coffee_brewer_backend::services::sessions`), so this test
//! imports and calls it directly rather than re-implementing the transaction
//! with hand-written SQL (which would validate the schema but never the
//! shipping queries). Because it exercises the SAME compiled service the binary
//! and the coverage gate use, the exact INSERT column list, bind order and
//! `FromRow` mapping that ships are tested. A bind-order or column drift in the
//! real query now fails this test when a DB is available.
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

// Use the models from the library crate.
use coffee_brewer_backend::models::{BrewingMethod, CreateBrewingSessionRequest};

// The production service now lives in the library crate (`services::sessions`),
// so this test calls it directly rather than re-compiling the source via
// `#[path]`. That means it exercises the SAME compiled service the binary and
// the coverage gate measure - the shipping INSERT column list, bind order and
// `BrewingSession` `FromRow` mapping - so a bind-order or column drift in the
// real query still fails this test when a DB is available.
use coffee_brewer_backend::services::sessions::{SaveError, SessionService};

/// Connects to `DATABASE_URL` (falling back to `TEST_DATABASE_URL`) and ensures
/// the schema is present. Returns `None` when neither variable is set so the
/// (ignored) tests degrade cleanly.
async fn pool() -> Option<PgPool> {
    let url = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("TEST_DATABASE_URL"))
        .ok()?;
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

/// Builds a valid Espresso request (18 g / 36 g, ratio 2.0, 93 C, 30 s) against
/// the given bean and grinder. This is the shape the API layer hands to
/// `SessionService::log_brew`.
fn espresso_request(bean: Uuid, grinder: Uuid) -> CreateBrewingSessionRequest {
    CreateBrewingSessionRequest {
        bean_id: bean,
        grinder_id: grinder,
        brewing_method: BrewingMethod::Espresso,
        grind_setting: 12,
        water_temp_celsius: Some(93),
        brew_time_seconds: Some(30),
        coffee_grams: 18.0,
        water_grams: 36.0,
        tasting_notes: None,
        rating: None,
        feedback: None,
        suggestions: None,
        is_template: false,
    }
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
/// also proves migration 0002 relaxed the schema. Crucially, this calls the
/// real `SessionService::log_brew`, so the shipping INSERT column list, bind
/// order and `BrewingSession` `FromRow` mapping are exercised end to end.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn espresso_logs_and_decrements_atomically() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await;

    let service = SessionService::new(&pool);
    let session = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect("espresso brew logs");

    // The returned row maps every column, including the GENERATED ratio.
    assert_eq!(session.bean_id, bean);
    assert_eq!(session.coffee_grams, 18.0);
    assert_eq!(session.water_grams, 36.0);
    assert_eq!(session.coffee_ratio, Some(2.0), "generated coffee_ratio must be 2.0");

    // The session is persisted and readable back through the service.
    let fetched = service
        .get_session(session.id)
        .await
        .expect("read session")
        .expect("session exists");
    assert_eq!(fetched.id, session.id);
    assert_eq!(fetched.coffee_ratio, Some(2.0));

    let after: Option<f32> =
        sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
            .bind(bean)
            .fetch_one(&pool)
            .await
            .expect("read grams");
    assert_eq!(after, Some(82.0), "grams must drop by exactly the dose");

    cleanup(&pool, bean, grinder).await;
}

/// Insufficient quantity fails the WHOLE save: the service returns
/// `InsufficientQuantity` and the rollback leaves no session and the grams
/// unchanged (never a silent clamp to zero).
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn insufficient_quantity_rolls_back_entire_save() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(5.0)).await; // less than an 18 g dose

    let service = SessionService::new(&pool);
    let err = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect_err("5 g must be insufficient for an 18 g dose");
    match err {
        SaveError::InsufficientQuantity {
            available,
            required,
        } => {
            assert_eq!(available, 5.0);
            assert_eq!(required, 18.0);
        }
        other => panic!("expected InsufficientQuantity, got {other:?}"),
    }

    // No session and grams untouched (the whole save rolled back).
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
/// a brew and is not decremented. Exercises `log_brew`'s untracked-bean branch.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn untracked_bean_never_blocks_and_is_not_decremented() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, None).await;

    let service = SessionService::new(&pool);
    let session = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect("untracked bean brew logs");

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE id = $1")
        .bind(session.id)
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
