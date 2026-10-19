//! DB-backed integration tests for the coffee-bean inventory slice (ticket #142).
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d, matching
//! the repo convention that DB-backed tests are opt-in via `--ignored` (so the
//! `--lib` coverage gate, which never compiles `tests/`, is unaffected). Run
//! them against a real database with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test bean_inventory_db -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! (0001_init.sql + 0002_relax_session_bounds.sql) via `sqlx::migrate!`. Each
//! test cleans up the rows it inserts (in reverse FK order) so the suite can
//! run repeatedly, and `--test-threads=1` keeps the shared tables serialized.
//!
//! WHY THIS TEST COMPILES THE REAL SERVICE: the production bean code
//! (`BeanService`) lives in the binary target, so it cannot be imported from
//! the library crate. Rather than re-implement the queries with hand-written
//! SQL (which would validate the schema but never the shipping queries), this
//! test compiles the actual service source via `#[path]` and calls it. The
//! `crate::`-relative imports inside the service resolve to the library
//! re-exports declared below, so the test exercises the exact SELECT/INSERT/
//! UPDATE column lists, `is_active` and active-vs-empty-bag filters, the
//! usage-history JOIN and the `FromRow` mappings that ship. A column, filter
//! or JOIN drift in a real query now fails this test when a DB is available.
//!
//! Scope mirrors the ticket's acceptance criteria, all driven through
//! `BeanService`:
//! - create a bean and read it back (`create_bean` + `get_bean`),
//! - edit a bean's fields (`update_bean`),
//! - soft-delete a bean WITHOUT losing its brewing sessions (`delete_bean`),
//! - the active list excludes soft-deleted AND zero-quantity beans while
//!   keeping a NULL-quantity (untracked) bean (`get_active_beans`),
//! - per-bean usage history: date, grams used, rating, grinder, method
//!   (`get_bean_usage_history`).
//!
//! Freshness (within 30 days of roast) is intentionally NOT tested here: it is
//! frontend presentation logic in `frontend/lib/beans/inventory.ts`, already
//! unit-tested at 100% by its Vitest suite. The spec does not define a backend
//! freshness endpoint, so inventing one would be out of scope.

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// Re-export the `models` module under the `crate::` path the service source
// expects, so the `#[path]`-included `services/beans.rs` compiles unchanged
// inside this test crate. This is the same public library module the binary
// re-exports in `main.rs`; `beans.rs` only references `crate::models` (unlike
// the session service, it needs no `recipe`/`session_query`/`validation`).
use coffee_brewer_backend::models;

use models::CreateCoffeeBeanRequest;

// Compile the ACTUAL production service into this test crate. The service has
// no dependency on the `api` layer (only on `models`, re-exported above), so it
// builds standalone here. `dead_code` is allowed on the module because each
// test calls only a subset of the service surface (e.g. no test calls
// `list_beans`), and the unused members would otherwise warn when the source is
// compiled into the test crate rather than the binary.
#[allow(dead_code)]
#[path = "../src/services/beans.rs"]
mod beans;

use beans::BeanService;

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

/// Inserts a grinder and returns its id (brewing sessions require a grinder).
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

/// Builds a valid create request for a bean with the given name and remaining
/// grams. Roast five days ago, purchased three days ago (satisfies the
/// `roast_date <= purchase_date` CHECK and never a future date).
fn bean_request(name: &str, remaining: Option<f32>) -> CreateCoffeeBeanRequest {
    let today = Utc::now().naive_utc().date();
    CreateCoffeeBeanRequest {
        name: name.to_string(),
        origin: "Ethiopia".to_string(),
        roast_date: today - Duration::days(5),
        purchase_date: today - Duration::days(3),
        remaining_grams: remaining,
        variety: Some("Heirloom".to_string()),
        processing_method: Some("Washed".to_string()),
    }
}

/// Removes every row this suite could have created, in reverse FK order, so the
/// database is left clean regardless of which assertions ran.
async fn cleanup(pool: &PgPool, bean_ids: &[Uuid], grinder_ids: &[Uuid]) {
    for bean in bean_ids {
        sqlx::query("DELETE FROM brewing_sessions WHERE bean_id = $1")
            .bind(bean)
            .execute(pool)
            .await
            .ok();
    }
    for bean in bean_ids {
        sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
            .bind(bean)
            .execute(pool)
            .await
            .ok();
    }
    for grinder in grinder_ids {
        sqlx::query("DELETE FROM grinders WHERE id = $1")
            .bind(grinder)
            .execute(pool)
            .await
            .ok();
    }
}

/// `create_bean` persists the row and `get_bean` reads it back with every
/// field intact, including `is_active = true` and the server-assigned id.
/// Exercises the shipping INSERT column list / RETURNING mapping and the
/// `get_bean` SELECT (which also filters on `is_active = true`).
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn create_bean_then_get_bean_reads_it_back() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let created = service
        .create_bean(bean_request("Create Read", Some(250.0)))
        .await
        .expect("create bean");

    assert_eq!(created.name, "Create Read");
    assert_eq!(created.origin, "Ethiopia");
    assert_eq!(created.remaining_grams, Some(250.0));
    assert_eq!(created.variety.as_deref(), Some("Heirloom"));
    assert_eq!(created.processing_method.as_deref(), Some("Washed"));
    assert!(created.is_active, "a freshly created bean is active");

    let fetched = service
        .get_bean(created.id)
        .await
        .expect("get bean")
        .expect("bean exists");
    assert_eq!(fetched.id, created.id);
    assert_eq!(fetched.name, "Create Read");
    assert_eq!(fetched.remaining_grams, Some(250.0));
    assert!(fetched.is_active);

    cleanup(&pool, &[created.id], &[]).await;
}

/// `update_bean` edits the mutable fields and returns the updated row; a later
/// `get_bean` confirms the change persisted. Exercises the shipping UPDATE
/// column list and its `is_active = true` guard.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn update_bean_edits_fields() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let created = service
        .create_bean(bean_request("Before Edit", Some(250.0)))
        .await
        .expect("create bean");

    let mut edit = bean_request("After Edit", Some(100.0));
    edit.origin = "Colombia".to_string();
    edit.variety = Some("Caturra".to_string());

    let updated = service
        .update_bean(created.id, edit)
        .await
        .expect("update bean")
        .expect("bean exists for update");

    assert_eq!(updated.id, created.id);
    assert_eq!(updated.name, "After Edit");
    assert_eq!(updated.origin, "Colombia");
    assert_eq!(updated.remaining_grams, Some(100.0));
    assert_eq!(updated.variety.as_deref(), Some("Caturra"));

    // The change is durable: a fresh read observes the edit.
    let fetched = service
        .get_bean(created.id)
        .await
        .expect("get bean")
        .expect("bean exists");
    assert_eq!(fetched.name, "After Edit");
    assert_eq!(fetched.origin, "Colombia");
    assert_eq!(fetched.remaining_grams, Some(100.0));

    cleanup(&pool, &[created.id], &[]).await;
}

/// `delete_bean` soft-deletes (flips `is_active` to false) rather than removing
/// the row: `get_bean` (which filters `is_active = true`) stops returning it,
/// but the row itself and any brewing session that references it survive.
/// Exercises the shipping soft-delete UPDATE and proves sessions are retained.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn delete_bean_soft_deletes_but_keeps_sessions() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);
    let grinder_id = insert_grinder(&pool).await;

    let created = service
        .create_bean(bean_request("Soft Delete", Some(250.0)))
        .await
        .expect("create bean");

    // Record a brewing session that uses this bean.
    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams)
           VALUES ($1, $2, $3, 'V60', 20, 20.0, 320.0)"#,
    )
    .bind(session_id)
    .bind(created.id)
    .bind(grinder_id)
    .execute(&pool)
    .await
    .expect("insert session");

    let deleted = service.delete_bean(created.id).await.expect("delete bean");
    assert!(deleted, "soft-delete reports it affected the row");

    // The service's active-filtered read no longer sees it...
    let after = service.get_bean(created.id).await.expect("get bean");
    assert!(after.is_none(), "soft-deleted bean is hidden from get_bean");

    // ...but the row is retained with is_active = false.
    let is_active: Option<bool> =
        sqlx::query_scalar("SELECT is_active FROM coffee_beans WHERE id = $1")
            .bind(created.id)
            .fetch_optional(&pool)
            .await
            .expect("query bean row");
    assert_eq!(
        is_active,
        Some(false),
        "soft-deleted bean row is kept, just inactive"
    );

    // And its brewing session still exists (soft delete must not cascade).
    let session_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM brewing_sessions WHERE id = $1)",
    )
    .bind(session_id)
    .fetch_one(&pool)
    .await
    .expect("query session existence");
    assert!(session_exists, "soft delete must not drop brewing sessions");

    // Deleting an already-inactive bean is a no-op (guarded by is_active).
    let again = service.delete_bean(created.id).await.expect("delete again");
    assert!(!again, "re-deleting an inactive bean affects no row");

    cleanup(&pool, &[created.id], &[grinder_id]).await;
}

/// `get_active_beans` returns active beans with stock (`remaining_grams > 0`)
/// AND untracked beans (`remaining_grams IS NULL`), while excluding
/// soft-deleted beans and in-stock-but-empty (`remaining_grams = 0`) beans.
/// Exercises the exact `is_active = true AND (remaining_grams > 0 OR
/// remaining_grams IS NULL)` filter that ships.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn get_active_beans_applies_active_and_stock_rules() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let active = service
        .create_bean(bean_request("Active Bag", Some(250.0)))
        .await
        .expect("create active bean");
    let untracked = service
        .create_bean(bean_request("Untracked Bag", None))
        .await
        .expect("create untracked bean");
    let empty = service
        .create_bean(bean_request("Empty Bag", Some(0.0)))
        .await
        .expect("create empty bean");
    let deleted = service
        .create_bean(bean_request("Deleted Bag", Some(250.0)))
        .await
        .expect("create deleted bean");
    service
        .delete_bean(deleted.id)
        .await
        .expect("soft delete bean");

    let ids: Vec<Uuid> = service
        .get_active_beans()
        .await
        .expect("get active beans")
        .into_iter()
        .map(|b| b.id)
        .collect();

    assert!(ids.contains(&active.id), "active, in-stock bean must appear");
    assert!(
        ids.contains(&untracked.id),
        "untracked (NULL quantity) bean must appear"
    );
    assert!(
        !ids.contains(&empty.id),
        "zero-quantity bean must be excluded"
    );
    assert!(
        !ids.contains(&deleted.id),
        "soft-deleted bean must be excluded"
    );

    cleanup(
        &pool,
        &[active.id, untracked.id, empty.id, deleted.id],
        &[],
    )
    .await;
}

/// `get_bean_usage_history` returns one `BeanUsageRecord` per brewing session
/// that consumed the bean, newest first, flattening the grinder's
/// `brand || ' ' || model` and surfacing grams used, rating and method.
/// Exercises the shipping JOIN against `grinders` and the record `FromRow`.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn get_bean_usage_history_reports_sessions() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);
    let grinder_id = insert_grinder(&pool).await;

    let bean = service
        .create_bean(bean_request("Usage History", Some(250.0)))
        .await
        .expect("create bean");

    // Two sessions at different times so we can assert the newest-first order.
    let older = Uuid::new_v4();
    let newer = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams, rating, created_at)
           VALUES ($1, $2, $3, 'V60', 20, 18.0, 288.0, 8.0, $4)"#,
    )
    .bind(older)
    .bind(bean.id)
    .bind(grinder_id)
    .bind(Utc::now() - Duration::hours(2))
    .execute(&pool)
    .await
    .expect("insert older session");
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams, rating, created_at)
           VALUES ($1, $2, $3, 'Espresso', 12, 20.0, 320.0, 9.0, $4)"#,
    )
    .bind(newer)
    .bind(bean.id)
    .bind(grinder_id)
    .bind(Utc::now())
    .execute(&pool)
    .await
    .expect("insert newer session");

    let history = service
        .get_bean_usage_history(bean.id)
        .await
        .expect("get usage history");

    assert_eq!(history.len(), 2, "one record per session");

    // Newest first (ORDER BY created_at DESC).
    let first = &history[0];
    assert_eq!(first.session_id, newer);
    assert_eq!(first.grams_used, 20.0);
    assert_eq!(first.rating, Some(9.0));
    assert_eq!(first.grinder_used, "Comandante C40");
    assert_eq!(first.brewing_method, "Espresso");

    let second = &history[1];
    assert_eq!(second.session_id, older);
    assert_eq!(second.grams_used, 18.0);
    assert_eq!(second.rating, Some(8.0));
    assert_eq!(second.grinder_used, "Comandante C40");
    assert_eq!(second.brewing_method, "V60");

    cleanup(&pool, &[bean.id], &[grinder_id]).await;
}
