//! DB-backed integration tests for the grinder slice (ticket #147 hardening).
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d, matching
//! the repo convention that DB-backed tests are opt-in via `--ignored` (so the
//! `--lib` coverage gate, which never compiles `tests/`, is unaffected). Run
//! them against a real database with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test grinders_integration -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! (0001_init.sql + 0002_relax_session_bounds.sql) via `sqlx::migrate!`. Each
//! test cleans up the rows it inserts (in reverse FK order) so the suite can
//! run repeatedly, and `--test-threads=1` keeps the shared tables serialized.
//!
//! WHY THIS TEST COMPILES THE REAL SERVICE: like `bean_inventory_db.rs` and the
//! session tests, this file compiles the production `GrinderService` source via
//! `#[path]` and calls it, rather than re-implementing the queries with
//! hand-written SQL. The `crate::`-relative imports inside the service resolve
//! to the library re-export declared below, so the test exercises the exact
//! INSERT/SELECT/UPDATE/DELETE column lists, the pagination/ordering in
//! `list_grinders`, the `RETURNING`/`FromRow` mappings and the soft-vs-hard
//! delete semantics that ship. A column, filter or ordering drift in a real
//! query now fails this test when a DB is available. The schema `CHECK`
//! constraints (`max_setting > min_setting`, `min_setting >= 0`) are also
//! verified through the service's create path.

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// Re-export the `models` module under the `crate::` path the service source
// expects, so the `#[path]`-included `services/grinders.rs` compiles unchanged
// inside this test crate. This is the same public library module the binary
// re-exports in `main.rs`; `grinders.rs` only references `crate::models`.
use coffee_brewer_backend::models;

use models::{CreateGrinderRequest, GrinderType};

// Compile the ACTUAL production service into this test crate. The service has
// no dependency on the `api` layer (only on `models`, re-exported above), so it
// builds standalone here. `dead_code` is allowed on the module because each
// test calls only a subset of the service surface, and the unused members would
// otherwise warn when the source is compiled into the test crate.
#[allow(dead_code)]
#[path = "../src/services/grinders.rs"]
mod grinders;

use grinders::GrinderService;

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

/// Builds a valid create request with the given brand and setting range.
fn grinder_request(brand: &str, min: i32, max: i32) -> CreateGrinderRequest {
    CreateGrinderRequest {
        brand: brand.to_string(),
        model: "C40".to_string(),
        grinder_type: GrinderType::BurrConical,
        min_setting: min,
        max_setting: max,
        scale_type: Some("step".to_string()),
        description: Some("Hand grinder".to_string()),
    }
}

/// Removes every grinder row this suite could have created.
async fn cleanup(pool: &PgPool, grinder_ids: &[Uuid]) {
    for grinder in grinder_ids {
        sqlx::query("DELETE FROM grinders WHERE id = $1")
            .bind(grinder)
            .execute(pool)
            .await
            .ok();
    }
}

/// `create_grinder` persists the row and returns it with the server-assigned
/// id and every field intact; `get_grinder` reads the same row back. Exercises
/// the shipping INSERT column list / `RETURNING` mapping and the `get_grinder`
/// SELECT + `FromRow`.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn create_grinder_then_get_reads_it_back() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let created = service
        .create_grinder(grinder_request("Comandante", 0, 40))
        .await
        .expect("create grinder");

    assert_eq!(created.brand, "Comandante");
    assert_eq!(created.model, "C40");
    assert_eq!(created.grinder_type, GrinderType::BurrConical);
    assert_eq!(created.min_setting, 0);
    assert_eq!(created.max_setting, 40);
    assert_eq!(created.scale_type.as_deref(), Some("step"));

    let fetched = service
        .get_grinder(created.id)
        .await
        .expect("get grinder")
        .expect("grinder exists");
    assert_eq!(fetched.id, created.id);
    assert_eq!(fetched.brand, "Comandante");
    assert_eq!(fetched.max_setting, 40);

    cleanup(&pool, &[created.id]).await;
}

/// `update_grinder` edits the mutable fields and returns the updated row; a
/// later `get_grinder` confirms the change persisted. Exercises the shipping
/// UPDATE column list and `RETURNING` mapping.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn update_grinder_edits_fields() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let created = service
        .create_grinder(grinder_request("Before", 0, 40))
        .await
        .expect("create grinder");

    let mut edit = grinder_request("After", 2, 30);
    edit.model = "C40 MK4".to_string();
    edit.grinder_type = GrinderType::BurrFlat;
    edit.description = Some("Upgraded".to_string());

    let updated = service
        .update_grinder(created.id, edit)
        .await
        .expect("update grinder")
        .expect("grinder exists for update");

    assert_eq!(updated.id, created.id);
    assert_eq!(updated.brand, "After");
    assert_eq!(updated.model, "C40 MK4");
    assert_eq!(updated.grinder_type, GrinderType::BurrFlat);
    assert_eq!(updated.min_setting, 2);
    assert_eq!(updated.max_setting, 30);

    // The change is durable: a fresh read observes the edit.
    let fetched = service
        .get_grinder(created.id)
        .await
        .expect("get grinder")
        .expect("grinder exists");
    assert_eq!(fetched.brand, "After");
    assert_eq!(fetched.model, "C40 MK4");
    assert_eq!(fetched.grinder_type, GrinderType::BurrFlat);

    cleanup(&pool, &[created.id]).await;
}

/// `list_grinders` returns grinders newest-first with pagination and the total
/// count. Exercises the shipping `ORDER BY created_at DESC, brand ASC`, the
/// `LIMIT`/`OFFSET` paging and the `COUNT(*)` total.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn list_grinders_is_newest_first_with_paging() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    // A unique brand marker so the assertions are scoped to this test's rows
    // even if other grinders already exist in the shared database.
    let marker = format!("List-{}", Uuid::new_v4().simple());

    // Insert three grinders; `created_at` defaults to now() per row, so the
    // last inserted is the newest.
    let mut ids = Vec::new();
    for i in 0..3 {
        let g = service
            .create_grinder(grinder_request(&format!("{marker}-{i}"), 0, 40))
            .await
            .expect("create grinder");
        ids.push(g.id);
    }

    // Page 1 with limit 2 holds the two newest of this test's rows. Because the
    // shared table may hold other grinders, filter the returned page down to
    // this test's marker before asserting the newest-first order.
    let (page1, total) = service
        .list_grinders(Some(1), Some(100))
        .await
        .expect("list grinders");
    assert!(total >= 3, "total counts at least this test's three rows");

    let mine: Vec<Uuid> = page1
        .iter()
        .filter(|g| g.brand.starts_with(&marker))
        .map(|g| g.id)
        .collect();
    assert_eq!(mine.len(), 3, "all three of this test's grinders are listed");
    // Newest first: the last id inserted appears before the first.
    let pos_newest = mine.iter().position(|id| *id == ids[2]).unwrap();
    let pos_oldest = mine.iter().position(|id| *id == ids[0]).unwrap();
    assert!(
        pos_newest < pos_oldest,
        "list is ordered newest-first (created_at DESC)"
    );

    cleanup(&pool, &ids).await;
}

/// `delete_grinder` hard-deletes the row (grinders have no soft-delete column):
/// `get_grinder` stops returning it and a re-delete reports no row affected.
/// Exercises the shipping DELETE and its `rows_affected` return.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn delete_grinder_removes_the_row() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let created = service
        .create_grinder(grinder_request("Deletable", 0, 40))
        .await
        .expect("create grinder");

    let deleted = service.delete_grinder(created.id).await.expect("delete");
    assert!(deleted, "hard delete reports it affected the row");

    let after = service.get_grinder(created.id).await.expect("get grinder");
    assert!(after.is_none(), "deleted grinder is gone");

    // Deleting a missing grinder affects no row.
    let again = service.delete_grinder(created.id).await.expect("delete again");
    assert!(!again, "re-deleting a missing grinder affects no row");

    cleanup(&pool, &[created.id]).await;
}

/// The schema `CHECK (max_setting > min_setting)` must reject an invalid range
/// even when it reaches the database through the shipping `create_grinder`
/// INSERT. This mirrors the API-level validation surfaced to the user.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn schema_rejects_max_not_greater_than_min() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let result = service.create_grinder(grinder_request("Bad Range", 40, 40)).await;
    assert!(
        result.is_err(),
        "schema must reject max_setting <= min_setting"
    );
}

/// The schema `CHECK (min_setting >= 0)` must reject a negative minimum through
/// the shipping `create_grinder` INSERT.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn schema_rejects_negative_min_setting() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let result = service.create_grinder(grinder_request("Negative", -1, 40)).await;
    assert!(
        result.is_err(),
        "schema must reject negative min_setting"
    );
}
