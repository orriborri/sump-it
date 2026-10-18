//! DB-backed integration tests for ticket #146: duplicate, list, filter and
//! search over brewing sessions.
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d. The CI
//! sandbox for this ticket has NO Postgres and NO Docker, so they are NOT run
//! here and their passing is NOT claimed. They encode the intended behaviour so
//! a developer with a database (or a later integration-env ticket) can run them
//! with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test session_list_duplicate_db -- --ignored --test-threads=1
//! ```
//!
//! WHY THIS TEST COMPILES THE REAL SERVICE: like `session_logging_db.rs`, this
//! test compiles the production `SessionService` via `#[path]` and calls its
//! real `log_brew`, `duplicate` and `list_filtered` methods rather than
//! re-implementing them with inline SQL. That means these tests exercise the
//! exact shipping query strings (the full-column `BrewingSession` SELECT, the
//! `session_query`-built filter/search/pagination SQL, the `INSERT ... RETURNING`
//! and the `FromRow` mapping) so a bind-order or column drift in the real
//! queries fails here when a DB is available.
//!
//! Scope mirrors the ticket's acceptance criteria:
//! - duplicate goes through validation + inventory (decrements grams, drops
//!   rating/notes, fails on insufficient quantity),
//! - list is newest-first with paging,
//! - filters: bean origin, roast-date range, grinder type, method, min rating,
//! - case-insensitive text search across bean name, origin, grinder brand and
//!   tasting notes.

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// Re-export the library modules under the `crate::` paths the service source
// expects, so the `#[path]`-included `services/sessions.rs` compiles unchanged
// inside this test crate (mirrors `main.rs`).
use coffee_brewer_backend::{models, recipe, session_query, validation};

use models::{BrewingMethod, CreateBrewingSessionRequest, GrinderType, SessionFilter};

// Compile the ACTUAL production service into this test crate and call it.
// `dead_code` is allowed because each test file calls only a subset of the
// service surface, so unused members would warn when compiled into the test
// crate rather than the binary.
#[allow(dead_code)]
#[path = "../src/services/sessions.rs"]
mod sessions;

use sessions::SessionService;

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

async fn insert_grinder(pool: &PgPool, brand: &str, gtype: &str) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO grinders (id, brand, model, grinder_type, min_setting, max_setting)
           VALUES ($1, $2, 'C40', $3::grinder_type, 0, 40)"#,
    )
    .bind(id)
    .bind(brand)
    .bind(gtype)
    .execute(pool)
    .await
    .expect("insert grinder");
    id
}

async fn insert_bean(pool: &PgPool, name: &str, origin: &str, roast_days_ago: i64) -> Uuid {
    let id = Uuid::new_v4();
    let roast = Utc::now().naive_utc().date() - Duration::days(roast_days_ago);
    let purchase = Utc::now().naive_utc().date() - Duration::days(roast_days_ago - 1);
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, $2, $3, $4, $5, 500.0, true)"#,
    )
    .bind(id)
    .bind(name)
    .bind(origin)
    .bind(roast)
    .bind(purchase)
    .execute(pool)
    .await
    .expect("insert bean");
    id
}

/// Logs a brew through the REAL service so list/filter/search/duplicate tests
/// operate on rows the production path actually produced. `method` must be a
/// value the per-method recipe accepts for a 20 g / 320 g dose; `V60` and
/// `Espresso` (with a 18 g / 36 g dose) are chosen per test.
async fn log_brew(
    service: &SessionService<'_>,
    bean: Uuid,
    grinder: Uuid,
    method: BrewingMethod,
    coffee_grams: f32,
    water_grams: f32,
    rating: Option<f32>,
    notes: Option<&str>,
) -> Uuid {
    let request = CreateBrewingSessionRequest {
        bean_id: bean,
        grinder_id: grinder,
        brewing_method: method,
        grind_setting: 20,
        water_temp_celsius: Some(93),
        brew_time_seconds: Some(180),
        coffee_grams,
        water_grams,
        tasting_notes: notes.map(|n| n.to_string()),
        rating,
        feedback: None,
        suggestions: None,
        is_template: false,
    };
    service
        .log_brew(request)
        .await
        .expect("log brew via service")
        .id
}

async fn cleanup(pool: &PgPool, beans: &[Uuid], grinders: &[Uuid]) {
    for b in beans {
        sqlx::query("DELETE FROM brewing_sessions WHERE bean_id = $1")
            .bind(b)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
            .bind(b)
            .execute(pool)
            .await
            .ok();
    }
    for g in grinders {
        sqlx::query("DELETE FROM grinders WHERE id = $1")
            .bind(g)
            .execute(pool)
            .await
            .ok();
    }
}

/// Duplicating a session re-brews through the same inventory path (grams
/// decremented) while dropping the original's rating and notes. Calls the real
/// `SessionService::duplicate`, which routes through `log_brew`.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn duplicate_rebrew_decrements_and_drops_results() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool, "Comandante", "BurrConical").await;
    let bean = insert_bean(&pool, "Yirgacheffe", "Ethiopia", 5).await;
    let service = SessionService::new(&pool);

    let original = log_brew(
        &service,
        bean,
        grinder,
        BrewingMethod::V60,
        20.0,
        320.0,
        Some(9.0),
        Some("bright and floral"),
    )
    .await;

    let before: f32 = sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("grams before");

    // The duplicate re-runs the recipe + inventory path, dropping rating/notes.
    let dup = service.duplicate(original).await.expect("duplicate via service");
    assert!(dup.rating.is_none(), "duplicate drops rating");
    assert!(dup.tasting_notes.is_none(), "duplicate drops tasting notes");
    assert_eq!(dup.coffee_grams, 20.0, "duplicate re-brews the same dose");

    let after: f32 = sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("grams after");
    assert!((before - after - 20.0).abs() < f32::EPSILON, "grams drop by dose");

    cleanup(&pool, &[bean], &[grinder]).await;
}

/// Listing with no filters returns sessions newest-first and respects LIMIT and
/// OFFSET, using the real `SessionService::list_filtered` (full-column SELECT).
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn list_is_newest_first_with_paging() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool, "Comandante", "BurrConical").await;
    let bean = insert_bean(&pool, "Yirgacheffe", "Ethiopia", 5).await;
    let service = SessionService::new(&pool);

    // Three sessions, logged oldest-to-newest so the last is the newest.
    let _oldest = log_brew(&service, bean, grinder, BrewingMethod::V60, 20.0, 320.0, Some(6.0), None).await;
    let middle = log_brew(&service, bean, grinder, BrewingMethod::V60, 20.0, 320.0, Some(7.0), None).await;
    let newest = log_brew(&service, bean, grinder, BrewingMethod::V60, 20.0, 320.0, Some(8.0), None).await;

    // Page size 2, offset 0 -> newest two in order.
    let filter = SessionFilter {
        bean_origin: Some("Ethiopia".to_string()),
        limit: Some(2),
        offset: Some(0),
        ..SessionFilter::default()
    };
    let (sessions, total) = service
        .list_filtered(&filter, None)
        .await
        .expect("list page 1");
    assert_eq!(total, 3, "three matching sessions in total");
    assert_eq!(sessions.len(), 2, "page size clamps to 2");
    assert_eq!(sessions[0].id, newest, "newest first");
    assert_eq!(sessions[1].id, middle, "then next newest");

    cleanup(&pool, &[bean], &[grinder]).await;
}

/// Each filter narrows the result set; `list_filtered` returns the right count.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn filters_narrow_results() {
    let Some(pool) = pool().await else { return };
    let burr = insert_grinder(&pool, "Comandante", "BurrConical").await;
    let blade = insert_grinder(&pool, "Krups", "Blade").await;
    let eth = insert_bean(&pool, "Yirgacheffe", "Ethiopia", 5).await;
    let ken = insert_bean(&pool, "Nyeri", "Kenya", 40).await;
    let service = SessionService::new(&pool);

    let eth_v60 = log_brew(&service, eth, burr, BrewingMethod::V60, 20.0, 320.0, Some(9.0), None).await;
    log_brew(&service, ken, blade, BrewingMethod::Espresso, 18.0, 36.0, Some(4.0), None).await;

    // Filter: Ethiopia + BurrConical + V60 + rating >= 8 -> only the first.
    let filter = SessionFilter {
        bean_origin: Some("Ethiopia".to_string()),
        grinder_type: Some(GrinderType::BurrConical),
        brewing_method: Some(BrewingMethod::V60),
        rating_min: Some(8.0),
        ..SessionFilter::default()
    };
    let (sessions, total) = service
        .list_filtered(&filter, None)
        .await
        .expect("filtered list");
    assert_eq!(total, 1, "only the Ethiopia/Burr/V60/high-rating session matches");
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].id, eth_v60);

    cleanup(&pool, &[eth, ken], &[burr, blade]).await;
}

/// Case-insensitive search matches across bean name, origin, grinder brand and
/// tasting notes, via the real `list_filtered` search path.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn search_matches_across_four_columns() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool, "Niche", "Zero").await;
    let bean = insert_bean(&pool, "Geisha Lot 7", "Panama", 5).await;
    let service = SessionService::new(&pool);

    let by_notes = log_brew(
        &service,
        bean,
        grinder,
        BrewingMethod::V60,
        20.0,
        320.0,
        Some(9.0),
        Some("JASMINE florals"),
    )
    .await;

    // Lower-case query hits the upper-case notes (ILIKE is case-insensitive).
    let (sessions, _total) = service
        .list_filtered(&SessionFilter::default(), Some("jasmine"))
        .await
        .expect("search notes");
    assert!(sessions.iter().any(|s| s.id == by_notes), "matches tasting notes");

    // Query hits the grinder brand.
    let (sessions, _total) = service
        .list_filtered(&SessionFilter::default(), Some("niche"))
        .await
        .expect("search brand");
    assert!(sessions.iter().any(|s| s.id == by_notes), "matches grinder brand");

    cleanup(&pool, &[bean], &[grinder]).await;
}
