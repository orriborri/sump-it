//! DB-backed integration tests for the grinder slice (ticket #147).
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d so that
//! `cargo test` runs cleanly without a database. They are run against a real
//! Postgres as part of the DB integration suite and encode the intended
//! behaviour. Run them (they read `DATABASE_URL`, falling back to
//! `TEST_DATABASE_URL`) with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test grinders_integration -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! via `sqlx::migrate!`. Each test cleans up the rows it inserts so the suite
//! can run repeatedly, and `--test-threads=1` keeps the shared tables
//! serialized.
//!
//! WHY THIS TEST CALLS THE REAL SERVICE: the production `GrinderService` lives
//! in the library crate (`coffee_brewer_backend::services::grinders`), so this
//! test imports and calls it directly rather than re-implementing the queries
//! with hand-written SQL. Because it exercises the SAME compiled service the
//! binary and the coverage gate use, the exact INSERT/SELECT/UPDATE/DELETE
//! column lists, the pagination/ordering in `list_grinders`, the
//! `RETURNING`/`FromRow` mappings and the soft-delete semantics that ship are
//! tested (ticket #165: `delete_grinder` retires a grinder via
//! `is_active = false` so its brewing sessions survive). A column, filter or ordering drift in a real query now fails this
//! test when a DB is available. The schema `CHECK` constraints
//! (`max_setting > min_setting`, `min_setting >= 0`) are also verified through
//! the service's create path.

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// Use the models from the library crate.
use coffee_brewer_backend::models::{CreateGrinderRequest, GrinderType};

// The production service lives in the library crate (`services::grinders`), so
// this test calls it directly rather than re-declaring the SQL. It exercises
// the SAME compiled service the binary and the coverage gate measure.
use coffee_brewer_backend::services::grinders::GrinderService;

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
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
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
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
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
///
/// The paging is pinned at a real page boundary (ported from
/// origin/spec-138-open-tickets commit 5a1d2d5): with `limit = 2` across the
/// shared table, this test walks every page, reassembles the full ordered id
/// list, confirms its length equals the reported `COUNT(*)` total (so no row is
/// skipped or double-counted at the `LIMIT`/`OFFSET` seam), and then checks
/// this test's three marker rows come back newest-first in that sequence. A
/// drift in the `LIMIT`/`OFFSET` arithmetic (an off-by-one page start, wrong
/// limit, or a `total` that disagrees with the pages) now fails the test.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
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

    // Walk the whole table one small page at a time so the `LIMIT`/`OFFSET`
    // boundary is actually exercised. `page1` also gives us the authoritative
    // `COUNT(*)` total to check the reassembled pages against.
    const LIMIT: i32 = 2;
    let (page1, total) = service
        .list_grinders(Some(1), Some(LIMIT))
        .await
        .expect("list grinders");
    assert!(total >= 3, "total counts at least this test's three rows");
    assert!(
        page1.len() <= LIMIT as usize,
        "a page never exceeds the requested limit"
    );

    // Number of pages needed to cover `total` rows at this limit (ceil div).
    let pages = ((total + LIMIT as i64 - 1) / LIMIT as i64) as i32;
    let mut all_ids: Vec<Uuid> = page1.iter().map(|g| g.id).collect();
    for page in 2..=pages {
        let (rows, page_total) = service
            .list_grinders(Some(page), Some(LIMIT))
            .await
            .expect("list grinders page");
        assert_eq!(page_total, total, "COUNT(*) total is stable across pages");
        assert!(
            rows.len() <= LIMIT as usize,
            "a page never exceeds the requested limit"
        );
        all_ids.extend(rows.iter().map(|g| g.id));
    }

    // The paged walk reassembles exactly `total` rows with no duplicates: that
    // is only true if every `OFFSET = (page - 1) * limit` lands on the right
    // boundary. A drift in the arithmetic skips or repeats a row and breaks
    // one of these two assertions.
    assert_eq!(
        all_ids.len() as i64,
        total,
        "paging through at limit {LIMIT} visits every row exactly once"
    );
    let mut unique = all_ids.clone();
    unique.sort();
    unique.dedup();
    assert_eq!(
        unique.len(),
        all_ids.len(),
        "no row is returned on two different pages"
    );

    // Within that reassembled order, this test's three rows are newest-first.
    let mine: Vec<Uuid> = all_ids
        .iter()
        .copied()
        .filter(|id| ids.contains(id))
        .collect();
    assert_eq!(mine.len(), 3, "all three of this test's grinders are listed");
    assert_eq!(
        mine,
        vec![ids[2], ids[1], ids[0]],
        "list is ordered newest-first (created_at DESC)"
    );

    cleanup(&pool, &ids).await;
}

/// `delete_grinder` SOFT-deletes the row (ticket #165): it flips
/// `is_active = false` rather than issuing a `DELETE`, so `get_grinder` and
/// `list_grinders` stop returning it while the row (and any sessions logged
/// against it) survive. A re-delete reports no row affected because the first
/// delete already retired it.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn delete_grinder_soft_deletes_the_row() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let created = service
        .create_grinder(grinder_request("Deletable", 0, 40))
        .await
        .expect("create grinder");
    assert!(created.is_active, "a freshly created grinder is active");

    let deleted = service.delete_grinder(created.id).await.expect("delete");
    assert!(deleted, "soft delete reports it affected the row");

    // The grinder is hidden from the active views...
    let after = service.get_grinder(created.id).await.expect("get grinder");
    assert!(after.is_none(), "retired grinder is hidden from get_grinder");

    // ...but the ROW still exists, now flagged inactive (not hard-deleted).
    let still_present: Option<bool> =
        sqlx::query_scalar("SELECT is_active FROM grinders WHERE id = $1")
            .bind(created.id)
            .fetch_optional(&pool)
            .await
            .expect("read is_active");
    assert_eq!(
        still_present,
        Some(false),
        "the grinder row survives as is_active = false (soft delete, not a DELETE)"
    );

    // Deleting an already-retired grinder affects no row.
    let again = service
        .delete_grinder(created.id)
        .await
        .expect("delete again");
    assert!(!again, "re-deleting an already-retired grinder affects no row");

    cleanup(&pool, &[created.id]).await;
}

/// Ticket #165 core invariant: retiring a grinder must NOT erase the brewing
/// sessions logged against it (the old `ON DELETE CASCADE` did exactly that).
/// Insert a grinder, a bean, and a brewing session referencing the grinder,
/// then soft-delete the grinder and assert the session row (and therefore the
/// bean usage history it feeds) still exists.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn retiring_a_grinder_keeps_its_sessions() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let grinder = service
        .create_grinder(grinder_request("Keeper", 0, 40))
        .await
        .expect("create grinder");

    // A bean to satisfy the brewing_sessions.bean_id FK.
    let bean_id = Uuid::new_v4();
    let roast = chrono::Utc::now().naive_utc().date() - chrono::Duration::days(5);
    let purchase = chrono::Utc::now().naive_utc().date() - chrono::Duration::days(3);
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, 'History Bean', 'Ethiopia', $2, $3, 200.0, true)"#,
    )
    .bind(bean_id)
    .bind(roast)
    .bind(purchase)
    .execute(&pool)
    .await
    .expect("insert bean");

    // A brewing session referencing the grinder.
    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting,
            coffee_grams, water_grams)
           VALUES ($1, $2, $3, 'V60', 20, 20.0, 320.0)"#,
    )
    .bind(session_id)
    .bind(bean_id)
    .bind(grinder.id)
    .execute(&pool)
    .await
    .expect("insert session");

    // Retire the grinder through the shipping soft-delete path.
    let deleted = service.delete_grinder(grinder.id).await.expect("delete");
    assert!(deleted, "soft delete affected the grinder row");

    // The session (and the usage history it feeds) MUST survive: no cascade.
    let session_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE id = $1")
            .bind(session_id)
            .fetch_one(&pool)
            .await
            .expect("count sessions");
    assert_eq!(
        session_count, 1,
        "retiring a grinder must NOT delete sessions logged against it"
    );

    // The bean usage history (which JOINs grinders) still returns the brew.
    let usage = coffee_brewer_backend::services::beans::BeanService::new(&pool)
        .get_bean_usage_history(bean_id)
        .await
        .expect("usage history");
    assert_eq!(
        usage.len(),
        1,
        "the retired grinder still joins into the bean usage history"
    );

    // Clean up: sessions first (FK is now ON DELETE RESTRICT), then bean, then
    // the retired grinder.
    sqlx::query("DELETE FROM brewing_sessions WHERE id = $1")
        .bind(session_id)
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(bean_id)
        .execute(&pool)
        .await
        .ok();
    cleanup(&pool, &[grinder.id]).await;
}

/// The schema `CHECK (max_setting > min_setting)` must reject an invalid range
/// even when it reaches the database through the shipping `create_grinder`
/// INSERT. This mirrors the API-level validation surfaced to the user.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn schema_rejects_max_not_greater_than_min() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let result = service
        .create_grinder(grinder_request("Bad Range", 40, 40))
        .await;
    assert!(
        result.is_err(),
        "schema must reject max_setting <= min_setting"
    );
}

/// The schema `CHECK (min_setting >= 0)` must reject a negative minimum through
/// the shipping `create_grinder` INSERT.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn schema_rejects_negative_min_setting() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let result = service
        .create_grinder(grinder_request("Negative", -1, 40))
        .await;
    assert!(result.is_err(), "schema must reject negative min_setting");
}
