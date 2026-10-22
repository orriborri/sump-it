//! DB-backed integration test for the grinder-range TOCTOU fix (ticket #168).
//!
//! THIS TEST REQUIRES A LIVE POSTGRES and is therefore `#[ignore]`d so that a
//! plain `cargo test` runs cleanly without a database. It is run against a real
//! Postgres as part of the DB integration suite. Run it (it reads
//! `DATABASE_URL`, falling back to `TEST_DATABASE_URL`) with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test session_grinder_toctou_db -- --ignored --test-threads=1
//! ```
//!
//! WHAT IT ENCODES (ticket #168 acceptance criterion): `SessionService::log_brew`
//! used to load and validate the grinder BEFORE opening the transaction, and
//! the transaction locked only the bean row `FOR UPDATE`. A concurrent grinder
//! update could narrow the setting range after validation but before the insert,
//! committing a session whose grind setting no longer satisfies the grinder's
//! range (time-of-check/time-of-use). The fix begins the transaction first,
//! locks the bean then the grinder `FOR UPDATE` inside it, and re-runs the
//! grind-range validation against the LOCKED grinder, so the validated range is
//! the one held under lock until commit.
//!
//! WHY THE CONSTRUCTIONS BELOW ARE DETERMINISTIC (not flaky):
//!   * `narrowed_grinder_range_is_observed_under_lock` proves the lock-then-
//!     validate ORDERING directly: it narrows the grinder range to exclude the
//!     grind setting and COMMITS that change, THEN calls `log_brew`. Because
//!     `log_brew` now re-reads the grinder inside its transaction, it observes
//!     the new range and rejects the brew with a `Recipe` error. If `log_brew`
//!     still validated a pre-transaction snapshot it could not see the change.
//!   * `concurrently_held_grinder_lock_serializes_brew` proves `log_brew`
//!     actually takes `FOR UPDATE` on the grinder (the TOCTOU seam): a separate
//!     transaction locks the grinder row and narrows its range but does NOT
//!     commit yet; `log_brew` is spawned for a setting valid only under the
//!     ORIGINAL range. The spawned brew MUST block on the grinder lock - we
//!     assert it is still pending after a grace period while the lock is held.
//!     Only after the other transaction COMMITS the narrowed range does
//!     `log_brew` proceed; it then re-reads the locked (narrowed) row and fails
//!     validation rather than committing a now-out-of-range session. The
//!     "still pending while locked, resolves after commit" sequence is a
//!     deterministic happens-before relation (not a race), so it is stable in CI.
//!
//! WHY THIS TEST CALLS THE REAL SERVICE: the production save path lives in the
//! library crate (`coffee_brewer_backend::services::sessions`), so this test
//! imports and calls `SessionService::log_brew` directly rather than
//! re-implementing the transaction. It therefore exercises the SAME compiled
//! locking/validation path that ships. Each test cleans up the rows it inserts.

use std::time::Duration;

use chrono::Utc;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

use coffee_brewer_backend::models::{BrewingMethod, CreateBrewingSessionRequest};
use coffee_brewer_backend::services::sessions::{SaveError, SessionService};

/// Connects to `DATABASE_URL` (falling back to `TEST_DATABASE_URL`) and ensures
/// the schema is present. Returns `None` when neither variable is set so the
/// (ignored) tests degrade cleanly. A pool of >= 3 connections is needed so the
/// held-lock test can run `log_brew` and the lock-holding transaction and the
/// assertions concurrently without starving.
async fn pool() -> Option<PgPool> {
    let url = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("TEST_DATABASE_URL"))
        .ok()?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .expect("connect to DATABASE_URL");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("run migrations");
    Some(pool)
}

/// Inserts a grinder with the wide range 0-40 so the Espresso grind setting of
/// 12 is initially VALID and can later be excluded by narrowing the range.
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

async fn insert_bean(pool: &PgPool) -> Uuid {
    let id = Uuid::new_v4();
    let roast = Utc::now().naive_utc().date() - chrono::Duration::days(5);
    let purchase = Utc::now().naive_utc().date() - chrono::Duration::days(3);
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, 'TOCTOU Bean', 'Ethiopia', $2, $3, 500.0, true)"#,
    )
    .bind(id)
    .bind(roast)
    .bind(purchase)
    .execute(pool)
    .await
    .expect("insert bean");
    id
}

/// A valid Espresso request (18 g / 36 g, ratio 2.0, 93 C, 30 s) whose
/// `grind_setting` of 12 sits inside the initial 0-40 grinder range but OUTSIDE
/// a later narrowed 20-40 range.
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

/// SEQUENTIAL contract test: once a grinder's range is narrowed (and committed)
/// to exclude the grind setting, `log_brew` observes the new range because it
/// re-reads the grinder INSIDE its transaction, and rejects the brew with a
/// `Recipe` error. No session is persisted. This proves the validation runs
/// against the current (locked) grinder row, not a stale pre-transaction snapshot.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn narrowed_grinder_range_is_observed_under_lock() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool).await;

    // Narrow the grinder range to 20-40 so the grind setting of 12 is now out
    // of range, and COMMIT it (plain execute auto-commits).
    sqlx::query("UPDATE grinders SET min_setting = 20 WHERE id = $1")
        .bind(grinder)
        .execute(&pool)
        .await
        .expect("narrow grinder range");

    let service = SessionService::new(&pool);
    let err = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect_err("grind setting 12 must be rejected under the narrowed 20-40 range");
    match err {
        SaveError::Recipe(_) => {}
        other => panic!("expected SaveError::Recipe for out-of-range grind, got {other:?}"),
    }

    // The rejected brew left no session behind.
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE bean_id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("count sessions");
    assert_eq!(count, 0, "an out-of-range brew must not persist a session");

    cleanup(&pool, bean, grinder).await;
}

/// CONCURRENCY contract test: proves `log_brew` acquires `FOR UPDATE` on the
/// grinder, which is what closes the TOCTOU window. A separate transaction
/// locks the grinder row and narrows its range but holds the lock (no commit
/// yet). `log_brew` is spawned for a setting valid only under the ORIGINAL
/// range; it MUST block on the grinder lock. We assert the spawned task is
/// still pending while the lock is held, then COMMIT the narrowed range; now
/// `log_brew` proceeds, re-reads the locked (narrowed) grinder and rejects the
/// brew with a `Recipe` error instead of committing a stale, out-of-range
/// session. The pending-then-resolves ordering is a happens-before relation, so
/// the test is deterministic rather than racy.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn concurrently_held_grinder_lock_serializes_brew() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool).await;

    // Open a holder transaction that locks the grinder row FOR UPDATE and
    // narrows its range inside the same transaction, but does NOT commit yet.
    // While this transaction is open, any FOR UPDATE on the same row blocks.
    let mut holder = pool.begin().await.expect("begin holder transaction");
    sqlx::query("SELECT id FROM grinders WHERE id = $1 FOR UPDATE")
        .bind(grinder)
        .fetch_one(&mut *holder)
        .await
        .expect("holder locks grinder row");
    sqlx::query("UPDATE grinders SET min_setting = 20 WHERE id = $1")
        .bind(grinder)
        .execute(&mut *holder)
        .await
        .expect("holder narrows range (uncommitted)");

    // Spawn log_brew on its own task/connection. It should block trying to lock
    // the grinder row inside its transaction.
    let brew_pool = pool.clone();
    let brew = tokio::spawn(async move {
        let service = SessionService::new(&brew_pool);
        service.log_brew(espresso_request(bean, grinder)).await
    });

    // While the holder keeps the grinder locked, log_brew cannot have finished:
    // it is parked on the FOR UPDATE. If it had already returned, the fix would
    // not be taking the grinder lock (the TOCTOU window would still be open).
    tokio::time::sleep(Duration::from_millis(500)).await;
    assert!(
        !brew.is_finished(),
        "log_brew must block on the grinder FOR UPDATE lock while it is held elsewhere"
    );

    // Commit the narrowed range. log_brew can now acquire the lock, re-read the
    // grinder (min_setting = 20) and reject the grind setting of 12.
    holder.commit().await.expect("commit narrowed range");

    let result = tokio::time::timeout(Duration::from_secs(10), brew)
        .await
        .expect("log_brew must finish once the grinder lock is released")
        .expect("spawned brew task joins");
    match result {
        Err(SaveError::Recipe(_)) => {}
        other => panic!(
            "expected the brew to be rejected (Recipe error) under the committed narrowed range, got {other:?}"
        ),
    }

    // No out-of-range session was committed.
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE bean_id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("count sessions");
    assert_eq!(count, 0, "a brew racing a grinder-range narrowing must not commit out of range");

    cleanup(&pool, bean, grinder).await;
}
