//! DB-backed integration test for issue #165: retiring (deleting) a grinder
//! must NOT destroy the brewing sessions that reference it.
//!
//! THIS TEST REQUIRES A LIVE POSTGRES and is therefore `#[ignore]`d so that
//! `cargo test` runs cleanly without a database. It is run against a real
//! Postgres as part of the DB integration suite and encodes the intended
//! behaviour. Run it (it reads `DATABASE_URL`, falling back to
//! `TEST_DATABASE_URL`) with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test grinder_delete_preserves_sessions_db -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! (through 0004_grinder_soft_delete.sql) via `sqlx::migrate!`. The test cleans
//! up every row it inserts so the suite can run repeatedly, and
//! `--test-threads=1` keeps the shared tables serialized.
//!
//! WHY THIS TEST CALLS THE REAL SERVICES: the production `GrinderService`,
//! `BeanService` and `SessionService` live in the library crate
//! (`coffee_brewer_backend::services`), so this test imports and calls them
//! directly rather than re-implementing the queries with hand-written SQL.
//! Because it exercises the SAME compiled services the binary and the coverage
//! gate use, the shipping soft-delete UPDATE, the `WHERE is_active = true`
//! filters and the session/bean-usage JOINs that deliberately do NOT filter on
//! `is_active` are all tested. A regression that reintroduced the
//! `ON DELETE CASCADE` FK or filtered the history JOIN on `is_active` would
//! fail this test when a DB is available.

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

use chrono::{Duration, Utc};

// Use the models and the REAL services from the library crate.
use coffee_brewer_backend::models::{
    BrewingMethod, CreateBrewingSessionRequest, CreateCoffeeBeanRequest, CreateGrinderRequest,
    GrinderType,
};
use coffee_brewer_backend::services::beans::BeanService;
use coffee_brewer_backend::services::grinders::GrinderService;
use coffee_brewer_backend::services::sessions::SessionService;

/// Connects to `DATABASE_URL` (falling back to `TEST_DATABASE_URL`) and ensures
/// the schema is present. Returns `None` when neither variable is set so the
/// (ignored) test degrades cleanly.
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

fn grinder_request() -> CreateGrinderRequest {
    CreateGrinderRequest {
        brand: "Comandante".to_string(),
        model: "C40".to_string(),
        grinder_type: GrinderType::BurrConical,
        min_setting: 0,
        max_setting: 40,
        scale_type: Some("step".to_string()),
        description: Some("Hand grinder".to_string()),
    }
}

fn bean_request() -> CreateCoffeeBeanRequest {
    let roast = Utc::now().naive_utc().date() - Duration::days(5);
    let purchase = Utc::now().naive_utc().date() - Duration::days(3);
    CreateCoffeeBeanRequest {
        name: "Preserve Bean".to_string(),
        origin: "Ethiopia".to_string(),
        roast_date: roast,
        purchase_date: purchase,
        remaining_grams: Some(100.0),
        variety: Some("Heirloom".to_string()),
        processing_method: Some("Washed".to_string()),
    }
}

/// A valid Espresso request (18 g / 36 g, ratio 2.0, 93 C, 30 s) against the
/// given bean and grinder, the shape the API hands to `log_brew`.
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
        tasting_notes: Some("Syrupy, chocolate".to_string()),
        rating: Some(8.0),
        feedback: None,
        suggestions: None,
        is_template: false,
    }
}

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

/// Retiring a grinder removes ZERO brewing_sessions rows and leaves session
/// history and bean usage history intact (issue #165 acceptance criteria).
///
/// Flow: create a grinder + bean, log a brew through the real `SessionService`,
/// retire the grinder through the real `GrinderService::delete_grinder`, then
/// assert:
///   * the grinder is retired (soft-deleted): `get_grinder` returns `None`,
///   * the brewing_sessions row for that grinder still exists with its fields
///     intact (the FK is ON DELETE RESTRICT, not CASCADE, and the delete is a
///     soft delete so nothing cascades at all),
///   * `get_bean_usage_history` still resolves the retired grinder (the JOIN
///     does NOT filter on `is_active`), so bean usage history survives.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn retiring_grinder_preserves_sessions_and_history() {
    let Some(pool) = pool().await else { return };

    let grinders = GrinderService::new(&pool);
    let beans = BeanService::new(&pool);
    let sessions = SessionService::new(&pool);

    let grinder = grinders
        .create_grinder(grinder_request())
        .await
        .expect("create grinder");
    let bean = beans.create_bean(bean_request()).await.expect("create bean");

    // Log a brew that references this grinder.
    let session = sessions
        .log_brew(espresso_request(bean.id, grinder.id))
        .await
        .expect("log brew");
    assert_eq!(session.grinder_id, grinder.id);

    // Retire (soft-delete) the grinder.
    let retired = grinders
        .delete_grinder(grinder.id)
        .await
        .expect("retire grinder");
    assert!(retired, "an active grinder is retired");

    // The grinder disappears from the active management path.
    let after = grinders.get_grinder(grinder.id).await.expect("get grinder");
    assert!(after.is_none(), "retired grinder is hidden from get_grinder");

    // CRITICAL: the brewing_sessions row survives with its fields intact. If
    // the FK were still ON DELETE CASCADE (or the delete were a hard delete),
    // this count would be zero.
    let surviving_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE grinder_id = $1")
            .bind(grinder.id)
            .fetch_one(&pool)
            .await
            .expect("count surviving sessions");
    assert_eq!(
        surviving_count, 1,
        "retiring a grinder must not delete any brewing_sessions rows"
    );

    // The session is still readable through the service and its fields are
    // intact (session history survives a retired grinder).
    let fetched = sessions
        .get_session(session.id)
        .await
        .expect("read session")
        .expect("session still exists after grinder retirement");
    assert_eq!(fetched.id, session.id);
    assert_eq!(fetched.grinder_id, grinder.id);
    assert_eq!(fetched.coffee_grams, 18.0);
    assert_eq!(fetched.water_grams, 36.0);
    assert_eq!(fetched.rating, Some(8.0));

    // Bean usage history still resolves the (now retired) grinder: the JOIN to
    // grinders must NOT filter on is_active.
    let history = beans
        .get_bean_usage_history(bean.id)
        .await
        .expect("read bean usage history");
    assert_eq!(history.len(), 1, "bean usage history survives grinder retirement");
    assert_eq!(history[0].session_id, session.id);
    assert_eq!(history[0].grinder_used, "Comandante C40");

    cleanup(&pool, bean.id, grinder.id).await;
}
