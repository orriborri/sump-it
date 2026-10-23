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

/// Forces the inventory-DECREMENT UPDATE to fail AFTER a successful lock and
/// insert, so the newly-inlined `.map_err(|e| db_error(e, "Failed to decrement
/// bean quantity"))?` branch in `log_brew` is genuinely covered rather than
/// excluded (US43/US44, docs/coverage.md: error mapping on DB queries is NEVER
/// excluded).
///
/// WHY THE FAILURE IS FORCED THIS WAY: the decrement UPDATE runs inside the
/// same transaction that already holds a `FOR UPDATE` lock on the bean row, so
/// the `api_router_db.rs` technique of dropping the whole `coffee_beans` table
/// mid-flight does NOT work here - a `DROP TABLE` would block on that lock and
/// deadlock the test. Instead we corrupt the schema the UPDATE depends on
/// BEFORE `log_brew` runs, from a separate statement: we drop the `updated_at`
/// column that the decrement writes (`SET ... updated_at = $3`). The earlier
/// steps still succeed - the grinder loads, the transaction begins, the
/// `SELECT remaining_grams ... FOR UPDATE` locks the row (that column is
/// untouched), the sufficiency check passes (100 g >= 18 g dose) and the
/// session INSERT into `brewing_sessions` succeeds (a different table) - so
/// execution reaches the decrement, where the UPDATE references the now-missing
/// `updated_at` column and errors, driving the error-mapping branch. The
/// service must surface `SaveError::Database(_)`.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn decrement_query_failure_maps_to_database_error() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await; // enough for an 18 g dose

    // Break the decrement UPDATE's target column BEFORE logging the brew, from
    // a separate statement so no lock is held when we alter the schema. The
    // lock + insert still succeed; only the decrement UPDATE touches
    // `updated_at`, so that is the step that fails.
    sqlx::query("ALTER TABLE coffee_beans DROP COLUMN updated_at")
        .execute(&pool)
        .await
        .expect("drop updated_at column");

    let service = SessionService::new(&pool);
    let err = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect_err("decrement UPDATE must fail once updated_at is gone");
    match err {
        SaveError::Database(_) => {}
        other => panic!("expected SaveError::Database, got {other:?}"),
    }

    // Restore the column so cleanup (and any later test on a shared database)
    // sees the migrated schema again, then clean up the throwaway rows. The
    // brew transaction rolled back, so no session row exists; the DELETE is a
    // harmless no-op in that case.
    sqlx::query(
        "ALTER TABLE coffee_beans ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    )
    .execute(&pool)
    .await
    .expect("restore updated_at column");
    cleanup(&pool, bean, grinder).await;
}

/// Forces `tx.commit()` ITSELF to fail AFTER a fully successful lock + insert +
/// decrement, so the newly-inlined `.map_err(|e| db_error(e, "Failed to commit
/// transaction"))?` branch in `log_brew` is genuinely covered rather than
/// excluded (US43/US44, docs/coverage.md: error mapping on DB queries is NEVER
/// excluded).
///
/// WHY THE FAILURE IS FORCED AT COMMIT SPECIFICALLY: every other failure point
/// in `log_brew` (the lock SELECT, the session INSERT, the inventory UPDATE)
/// short-circuits via `?` BEFORE step (8) commit is reached, so none of them
/// can exercise the commit mapping - the `decrement_query_failure_...` test
/// above returns at step (7) for exactly that reason. The only way to reach and
/// fail the commit is an error that Postgres defers to `COMMIT` time. We install
/// a `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` on
/// `brewing_sessions` whose function unconditionally `RAISE`s. Because the
/// trigger is DEFERRED, it does NOT fire during the INSERT inside the
/// transaction - the INSERT (and the earlier lock + the decrement UPDATE) all
/// succeed and execution reaches `tx.commit()`. At `COMMIT`, Postgres runs the
/// deferred constraint trigger, it raises, and the COMMIT fails, driving the
/// commit error-mapping branch. The service must surface `SaveError::Database(_)`.
///
/// The trigger/function are created from a separate statement BEFORE `log_brew`
/// (so no transaction lock is held when we touch the schema) and dropped again
/// afterwards, mirroring the restore-the-schema cleanup the decrement test uses.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn commit_failure_maps_to_database_error() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await; // enough for an 18 g dose

    // Install a DEFERRABLE INITIALLY DEFERRED constraint trigger on
    // brewing_sessions that always raises. Deferred means it fires at COMMIT,
    // not at INSERT time, so the in-transaction INSERT/lock/decrement succeed
    // and only the commit fails. Created from separate statements before
    // log_brew so no lock is held while we alter the schema.
    sqlx::query(
        r#"CREATE OR REPLACE FUNCTION sump_it_fail_at_commit()
           RETURNS trigger AS $$
           BEGIN
               RAISE EXCEPTION 'forced commit failure for coverage test';
           END;
           $$ LANGUAGE plpgsql"#,
    )
    .execute(&pool)
    .await
    .expect("create deferred-failure trigger function");
    sqlx::query(
        r#"CREATE CONSTRAINT TRIGGER sump_it_fail_at_commit_trg
           AFTER INSERT ON brewing_sessions
           DEFERRABLE INITIALLY DEFERRED
           FOR EACH ROW EXECUTE FUNCTION sump_it_fail_at_commit()"#,
    )
    .execute(&pool)
    .await
    .expect("create deferred constraint trigger");

    let service = SessionService::new(&pool);
    let err = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect_err("commit must fail once the deferred constraint trigger is installed");
    match err {
        SaveError::Database(_) => {}
        other => panic!("expected SaveError::Database, got {other:?}"),
    }

    // Drop the trigger and function so cleanup (and any later test on a shared
    // database) sees the migrated schema again, then clean up the throwaway
    // rows. The brew transaction rolled back (the commit failed), so no session
    // row exists; the DELETE is a harmless no-op in that case.
    sqlx::query("DROP TRIGGER IF EXISTS sump_it_fail_at_commit_trg ON brewing_sessions")
        .execute(&pool)
        .await
        .expect("drop deferred constraint trigger");
    sqlx::query("DROP FUNCTION IF EXISTS sump_it_fail_at_commit()")
        .execute(&pool)
        .await
        .expect("drop deferred-failure trigger function");
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

/// Ticket #168: `log_brew` loads and validates the grinder INSIDE the
/// transaction, so a brew logged against a RETIRED grinder is rejected rather
/// than validated against a stale, pre-transaction read.
///
/// The grinder is retired (soft-deleted) before `log_brew` runs. Because the
/// grinder is now selected `WHERE is_active = true ... FOR UPDATE` from inside
/// the transaction, the row is not found and the save fails with
/// `GrinderNotFound` with no session inserted.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn retired_grinder_is_rejected_inside_the_transaction() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await;

    // Retire the grinder (the #165 soft-delete path).
    sqlx::query("UPDATE grinders SET is_active = false WHERE id = $1")
        .bind(grinder)
        .execute(&pool)
        .await
        .expect("retire grinder");

    let service = SessionService::new(&pool);
    let err = service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect_err("a retired grinder must not accept a brew");
    match err {
        SaveError::GrinderNotFound => {}
        other => panic!("expected GrinderNotFound, got {other:?}"),
    }

    // No session was inserted and the grams are untouched (the save rolled back).
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE bean_id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("count sessions");
    assert_eq!(count, 0, "no session on a missing grinder");

    cleanup(&pool, bean, grinder).await;
}

/// Ticket #168 (TOCTOU / lock ordering): a grind setting that is valid for the
/// grinder's CURRENT range persists, and the grinder row is locked `FOR UPDATE`
/// for the life of the save so a concurrent range change cannot slip in between
/// validation and insert.
///
/// This test pins the ordering guarantee deterministically: a COMPETING
/// transaction grabs the grinder's row lock first and NARROWS the range so the
/// brew's grind setting (20) falls outside it, then commits. `log_brew` runs
/// concurrently; because it must take the SAME grinder `FOR UPDATE` lock (bean
/// first, then grinder - the fixed order documented on `log_brew`), it BLOCKS
/// until the competitor commits, then validates against the NEW, narrowed range
/// and rejects the brew with a `Recipe` error. Before #168 the grinder was read
/// and validated BEFORE any lock, so the brew would have been validated against
/// the stale wide range and wrongly persisted.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn concurrent_grinder_range_change_is_serialized_by_the_lock() {
    let Some(pool) = pool().await else { return };
    // Wide range initially admits the espresso grind setting of 12.
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await;

    // Competitor: open a transaction, lock the grinder FOR UPDATE and narrow
    // its range so grind setting 12 becomes invalid, but DO NOT commit yet.
    let mut competitor = pool.begin().await.expect("begin competitor tx");
    sqlx::query("SELECT id FROM grinders WHERE id = $1 FOR UPDATE")
        .bind(grinder)
        .fetch_one(&mut *competitor)
        .await
        .expect("competitor locks grinder");
    sqlx::query("UPDATE grinders SET min_setting = 20, max_setting = 40 WHERE id = $1")
        .bind(grinder)
        .execute(&mut *competitor)
        .await
        .expect("competitor narrows range");

    // Start the brew concurrently. It locks the bean, then blocks trying to
    // lock the grinder the competitor still holds.
    let brew_pool = pool.clone();
    let brew = tokio::spawn(async move {
        let service = SessionService::new(&brew_pool);
        // grind setting 12 is valid for the ORIGINAL range (0..=40) but NOT for
        // the competitor's narrowed range (20..=40).
        service.log_brew(espresso_request(bean, grinder)).await
    });

    // Give the brew task time to take the bean lock and start waiting on the
    // grinder lock, then let the competitor commit its narrowing.
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    competitor.commit().await.expect("competitor commits narrowing");

    // The brew now unblocks, re-reads the NARROWED range under its own lock, and
    // rejects grind setting 12 as out of range (TOCTOU closed).
    let result = brew.await.expect("brew task joins");
    match result {
        Err(SaveError::Recipe(_)) => {}
        other => panic!("expected a Recipe validation error from the narrowed range, got {other:?}"),
    }

    // The rejected brew inserted no session and did not decrement the grams.
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE bean_id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("count sessions");
    assert_eq!(count, 0, "a brew invalid under the committed range is not persisted");

    cleanup(&pool, bean, grinder).await;
}
