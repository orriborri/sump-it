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
//! tested. A column, filter or ordering drift in a real query now fails this
//! test when a DB is available. The schema `CHECK` constraints
//! (`max_setting > min_setting`, `min_setting >= 0`) are also verified through
//! the service's create path.
//!
//! Ticket #165: grinders are now SOFT-deleted (retired via `is_active = false`)
//! and `brewing_sessions.grinder_id` uses `ON DELETE RESTRICT`, so historical
//! brew sessions survive a grinder removal. `sessions_survive_grinder_removal`
//! encodes that invariant.
//!
//! Ticket #168: `log_brew` locks the grinder `FOR UPDATE` inside the brew
//! transaction before validating its range, closing the TOCTOU window.
//! `concurrent_grinder_range_change_cannot_violate_validated_range` encodes that
//! a concurrent range narrowing cannot persist an out-of-range session.

use std::time::Duration as StdDuration;

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// Use the models from the library crate.
use coffee_brewer_backend::models::{
    BrewingMethod, CreateBrewingSessionRequest, CreateGrinderRequest, GrinderType,
};

// The production services live in the library crate, so this test calls them
// directly rather than re-declaring the SQL. It exercises the SAME compiled
// services the binary and the coverage gate measure.
use coffee_brewer_backend::services::grinders::GrinderService;
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
    let (page1, total, _) = service
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
        let (rows, page_total, _) = service
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

/// `delete_grinder` SOFT-deletes the row (ticket #165): it sets
/// `is_active = false` rather than removing the row, so `get_grinder` and
/// `list_grinders` stop returning it while the row itself survives, and a
/// re-delete reports no active row affected. Exercises the shipping UPDATE and
/// its `rows_affected` return.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn delete_grinder_retires_the_row() {
    let Some(pool) = pool().await else { return };
    let service = GrinderService::new(&pool);

    let created = service
        .create_grinder(grinder_request("Deletable", 0, 40))
        .await
        .expect("create grinder");

    let deleted = service.delete_grinder(created.id).await.expect("delete");
    assert!(deleted, "soft delete reports it retired the active row");

    // The grinder is no longer surfaced through the active-only read path.
    let after = service.get_grinder(created.id).await.expect("get grinder");
    assert!(after.is_none(), "retired grinder is hidden from get_grinder");

    // But the row still EXISTS (soft delete, not removal), so history that
    // references it can survive.
    let still_present: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM grinders WHERE id = $1 AND is_active = false")
            .bind(created.id)
            .fetch_one(&pool)
            .await
            .expect("count retired grinder");
    assert_eq!(still_present, 1, "the row is retired, not deleted");

    // Retiring an already-retired grinder affects no active row.
    let again = service
        .delete_grinder(created.id)
        .await
        .expect("delete again");
    assert!(!again, "re-retiring an inactive grinder affects no row");

    cleanup(&pool, &[created.id]).await;
}

/// An invalid range (`max_setting <= min_setting`) must be rejected through the
/// shipping `create_grinder`. Ticket #166 moved this invariant into the service
/// seam, so the request is now refused at the service BEFORE the SQL (and the
/// schema `CHECK (max_setting > min_setting)` remains as a DB backstop). Either
/// way `create_grinder` returns an error.
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

/// A negative minimum setting must be rejected through the shipping
/// `create_grinder`. As above, ticket #166 refuses it at the service seam
/// before the SQL, with the schema `CHECK (min_setting >= 0)` as a backstop.
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

/// Inserts a quantity-tracked bean and returns its id. Used by the
/// session-survival and TOCTOU tests below.
async fn insert_bean(pool: &PgPool, remaining: Option<f32>) -> Uuid {
    let id = Uuid::new_v4();
    let roast = Utc::now().naive_utc().date() - Duration::days(5);
    let purchase = Utc::now().naive_utc().date() - Duration::days(3);
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, 'Grinder Test Bean', 'Ethiopia', $2, $3, $4, true)"#,
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

/// Builds a valid Espresso request (18 g / 36 g, ratio 2.0, 93 C, 30 s) with a
/// given grind setting against the bean and grinder.
fn espresso_request(bean: Uuid, grinder: Uuid, grind_setting: i32) -> CreateBrewingSessionRequest {
    CreateBrewingSessionRequest {
        bean_id: bean,
        grinder_id: grinder,
        brewing_method: BrewingMethod::Espresso,
        grind_setting,
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

/// Removes the sessions, bean and grinder a session-level test created, in FK
/// order (sessions first because `grinder_id`/`bean_id` now RESTRICT).
async fn cleanup_session_fixture(pool: &PgPool, bean: Uuid, grinder: Uuid) {
    sqlx::query("DELETE FROM brewing_sessions WHERE grinder_id = $1 OR bean_id = $2")
        .bind(grinder)
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

/// Ticket #165: deleting (retiring) a grinder must NOT remove the brewing
/// sessions that used it; brewing sessions are immutable history.
///
/// Logs a brew against a grinder, retires the grinder through the shipping
/// `delete_grinder`, and asserts the session row still exists afterwards. This
/// is the acceptance test for #165: before the fix, the `ON DELETE CASCADE` FK
/// plus a hard DELETE erased the session.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn sessions_survive_grinder_removal() {
    let Some(pool) = pool().await else { return };
    let grinder_svc = GrinderService::new(&pool);
    let session_svc = SessionService::new(&pool);

    let grinder = grinder_svc
        .create_grinder(grinder_request("Survivor", 0, 40))
        .await
        .expect("create grinder");
    let bean = insert_bean(&pool, Some(100.0)).await;

    let session = session_svc
        .log_brew(espresso_request(bean, grinder.id, 12))
        .await
        .expect("log brew");

    // Retire the grinder through the production soft-delete path.
    let retired = grinder_svc
        .delete_grinder(grinder.id)
        .await
        .expect("retire grinder");
    assert!(retired, "the active grinder was retired");

    // The historical session MUST still exist after the grinder is gone from
    // the active catalogue.
    let survived: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE id = $1")
            .bind(session.id)
            .fetch_one(&pool)
            .await
            .expect("count session");
    assert_eq!(survived, 1, "session history survives grinder removal (#165)");

    // And it is still readable with its grinder reference intact.
    let fetched = session_svc
        .get_session(session.id)
        .await
        .expect("read session")
        .expect("session exists");
    assert_eq!(fetched.grinder_id, grinder.id);

    cleanup_session_fixture(&pool, bean, grinder.id).await;
}

/// Ticket #168: a concurrent grinder-range change cannot persist a session that
/// violates the range validated at brew time.
///
/// `log_brew` locks the grinder row `FOR UPDATE` inside its transaction before
/// validating the grind setting against the range. This test proves the lock
/// closes the TOCTOU window:
///   1. Create a wide-range grinder (0..=40) and a brew that uses setting 30.
///   2. Open a SEPARATE transaction and `UPDATE ... FOR UPDATE` the grinder to
///      narrow its range to 0..=10 (which would make setting 30 invalid), but
///      do NOT commit yet - this holds the row lock.
///   3. Fire `log_brew` concurrently. It blocks trying to take the grinder lock.
///   4. Commit the narrowing. `log_brew` unblocks, re-reads the NOW-narrowed
///      range under its own lock, and must REJECT the brew (setting 30 is
///      outside 0..=10) with a recipe error - never persist an out-of-range
///      session.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn concurrent_grinder_range_change_cannot_violate_validated_range() {
    let Some(pool) = pool().await else { return };
    let grinder_svc = GrinderService::new(&pool);

    let grinder = grinder_svc
        .create_grinder(grinder_request("Concurrent", 0, 40))
        .await
        .expect("create grinder");
    let bean = insert_bean(&pool, Some(100.0)).await;
    let grinder_id = grinder.id;

    // (2) Hold a lock on the grinder while narrowing its range in an
    // uncommitted transaction.
    let mut narrow_tx = pool.begin().await.expect("begin narrowing tx");
    sqlx::query("UPDATE grinders SET max_setting = 10 WHERE id = $1")
        .bind(grinder_id)
        .execute(&mut *narrow_tx)
        .await
        .expect("narrow range (uncommitted)");

    // (3) Fire the brew concurrently; it will block on the grinder row lock.
    let brew_pool = pool.clone();
    let brew = tokio::spawn(async move {
        let svc = SessionService::new(&brew_pool);
        // grind setting 30 is valid for 0..=40 but NOT for the narrowed 0..=10.
        svc.log_brew(espresso_request(bean, grinder_id, 30)).await
    });

    // Give the brew a moment to reach and block on the grinder lock.
    tokio::time::sleep(StdDuration::from_millis(300)).await;

    // (4) Commit the narrowing, unblocking the brew. It now sees 0..=10.
    narrow_tx.commit().await.expect("commit narrowing");

    let result = brew.await.expect("brew task joins");

    // The brew must be rejected: the grind setting it validated against the
    // OLD range is out of the NEW (now-committed) range it re-reads under its
    // own lock. An out-of-range session must never be persisted.
    match result {
        Err(SaveError::Recipe(_)) => {}
        Err(other) => panic!("expected a recipe range rejection, got {other:?}"),
        Ok(session) => panic!(
            "a session was persisted against a narrowed range it violates: {:?}",
            session.id
        ),
    }

    // No session row may exist for this grinder.
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM brewing_sessions WHERE grinder_id = $1")
            .bind(grinder_id)
            .fetch_one(&pool)
            .await
            .expect("count sessions");
    assert_eq!(count, 0, "no out-of-range session may be persisted (#168)");

    cleanup_session_fixture(&pool, bean, grinder_id).await;
}
