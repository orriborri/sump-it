//! DB-backed integration test for ticket #165 (High / data loss): retiring a
//! grinder must NOT destroy the brewing sessions (and derived bean-usage
//! history) that reference it.
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d so that
//! `cargo test` runs cleanly without a database. They are run against a real
//! Postgres as part of the DB integration suite and encode the intended
//! behaviour. Run them (they read `DATABASE_URL`, falling back to
//! `TEST_DATABASE_URL`) with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test grinder_session_history_db -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! (through 0004) via `sqlx::migrate!`. Each test cleans up the rows it inserts
//! so the suite can run repeatedly.
//!
//! WHY THIS TEST CALLS THE REAL SERVICES: the production grinder lifecycle
//! (`GrinderService::delete_grinder`) and brew save path
//! (`SessionService::log_brew`) live in the library crate
//! (`coffee_brewer_backend::services::*`), so this test imports and calls them
//! directly rather than re-implementing the SQL. It therefore exercises the
//! SAME compiled services the binary and the coverage gate use, proving the
//! shipping soft-delete and the `ON DELETE RESTRICT` FK together protect
//! session history end to end.

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

use coffee_brewer_backend::models::{BrewingMethod, CreateBrewingSessionRequest};
use coffee_brewer_backend::services::grinders::GrinderService;
use coffee_brewer_backend::services::sessions::SessionService;

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
           VALUES ($1, 'History Bean', 'Ethiopia', $2, $3, $4, true)"#,
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

/// Builds a valid Espresso request (18 g / 36 g, ratio 2.0, 93 C, 30 s), the
/// same shape `session_logging_db.rs` uses for the save path.
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

/// Removes every row this test could have created. The grinder row has to be
/// hard-deleted LAST, after its referencing sessions are gone, because the
/// `ON DELETE RESTRICT` FK installed by migration 0004 rejects a hard delete
/// while a session still points at it.
async fn cleanup(pool: &PgPool, bean: Uuid, grinder: Uuid) {
    sqlx::query("DELETE FROM brewing_sessions WHERE grinder_id = $1")
        .bind(grinder)
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

/// Ticket #165 acceptance criterion: retiring a grinder preserves the brewing
/// sessions that used it, and the hardened FK rejects any hard delete that
/// would cascade-destroy that history.
///
/// Steps:
/// 1. Create a grinder and a tracked bean, then log a real Espresso brew via
///    `SessionService::log_brew` (so a `brewing_sessions` row and the derived
///    bean-usage history exist).
/// 2. Retire the grinder via `GrinderService::delete_grinder` (soft-delete).
/// 3. Assert the session STILL EXISTS and the bean-usage history survives.
/// 4. Assert a hard `DELETE FROM grinders` while a session references it is
///    REJECTED by the `ON DELETE RESTRICT` FK (defense-in-depth).
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn retiring_a_grinder_preserves_session_history() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool).await;
    let bean = insert_bean(&pool, Some(100.0)).await;

    // (1) Log a real brew through the shipping save path.
    let session_service = SessionService::new(&pool);
    let session = session_service
        .log_brew(espresso_request(bean, grinder))
        .await
        .expect("espresso brew logs");
    assert_eq!(session.grinder_id, grinder);

    // (2) Retire the grinder (soft-delete). It reports a row affected and then
    // disappears from the active-only `get_grinder`.
    let grinder_service = GrinderService::new(&pool);
    let retired = grinder_service
        .delete_grinder(grinder)
        .await
        .expect("retire grinder");
    assert!(retired, "retiring an active grinder affects its row");
    assert!(
        grinder_service
            .get_grinder(grinder)
            .await
            .expect("get grinder")
            .is_none(),
        "a retired grinder is hidden from the active-only get"
    );

    // (3) The session that used the grinder STILL EXISTS: no cascade delete.
    let sessions_remaining: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE grinder_id = $1")
            .bind(grinder)
            .fetch_one(&pool)
            .await
            .expect("count sessions for grinder");
    assert_eq!(
        sessions_remaining, 1,
        "retiring the grinder must NOT delete the brewing session (ticket #165)"
    );

    // The bean-usage history derived from that session also survives: the
    // session still links the (now retired) grinder to the bean.
    let usage_rows: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM brewing_sessions WHERE bean_id = $1 AND grinder_id = $2",
    )
    .bind(bean)
    .bind(grinder)
    .fetch_one(&pool)
    .await
    .expect("count bean usage rows");
    assert_eq!(usage_rows, 1, "bean usage history survives grinder retirement");

    // (4) Defense-in-depth: a hard DELETE of a grinder still referenced by a
    // session is REJECTED by the ON DELETE RESTRICT FK (migration 0004),
    // rather than silently cascading the session away.
    let hard_delete = sqlx::query("DELETE FROM grinders WHERE id = $1")
        .bind(grinder)
        .execute(&pool)
        .await;
    assert!(
        hard_delete.is_err(),
        "ON DELETE RESTRICT must reject a hard delete of a referenced grinder"
    );

    // The session is untouched by the rejected hard delete.
    let sessions_after_reject: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE grinder_id = $1")
            .bind(grinder)
            .fetch_one(&pool)
            .await
            .expect("count sessions after rejected hard delete");
    assert_eq!(
        sessions_after_reject, 1,
        "the rejected hard delete leaves the session history intact"
    );

    cleanup(&pool, bean, grinder).await;
}
