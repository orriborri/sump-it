//! DB-backed integration tests for the coffee-bean inventory slice (ticket #142).
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d so that
//! `cargo test` runs cleanly without a database. They are run against a real
//! Postgres as part of the DB integration suite and document the
//! database-backed behaviour of the bean service. Run them (they read
//! `DATABASE_URL`, falling back to `TEST_DATABASE_URL`) with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test bean_inventory_db -- --ignored --test-threads=1
//! ```
//!
//! The schema is created from the single source of truth under `migrations/`
//! via `sqlx::migrate!`. Each test cleans up the rows it inserts so the suite
//! can run repeatedly, and `--test-threads=1` keeps the shared tables
//! serialized.
//!
//! WHY THIS TEST CALLS THE REAL SERVICE: the production `BeanService` lives in
//! the library crate (`coffee_brewer_backend::services::beans`), so this test
//! imports and calls it directly rather than re-implementing the queries with
//! hand-written SQL that only mirrors the shipping code. Because it exercises
//! the SAME compiled service the binary and the coverage gate use, the exact
//! INSERT/SELECT/UPDATE column lists, the soft-delete semantics, the
//! active-list filter and the `brewing_method::text` cast in the usage-history
//! query that ship are tested. A column, filter or cast drift in a real query
//! now fails this test when a DB is available.
//!
//! Scope mirrors the ticket's acceptance criteria:
//! - create a bean and read it back,
//! - edit a bean,
//! - soft-delete a bean WITHOUT losing its brewing sessions,
//! - the active list excludes soft-deleted and zero-quantity beans,
//! - per-bean usage history (date, grams used, rating, grinder, method),
//! - app validation still rejects future dates even though the DB no longer
//!   forbids purchase-before-roast.

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// The production bean service lives in the library crate (`services::beans`),
// so this test drives it directly rather than re-declaring its SQL.
use coffee_brewer_backend::models::CreateCoffeeBeanRequest;
use coffee_brewer_backend::services::beans::BeanService;

// The application-level bean rules also live in the library crate; import the
// single source of truth so this suite can assert that app validation still
// rejects future dates even though the DB no longer forbids
// purchase-before-roast.
use coffee_brewer_backend::models::validate_bean_fields;
use coffee_brewer_backend::validation::ValidationErrorType;

/// Connects to the database named by `DATABASE_URL` (falling back to
/// `TEST_DATABASE_URL`) and ensures the schema is present. Returns `None` when
/// neither variable is set so the (ignored) tests degrade cleanly if invoked
/// without configuration.
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

/// Builds a valid create request with the given name and remaining grams.
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

/// `create_bean` persists the row and returns it with the server-assigned id
/// and every field intact; `get_bean` reads the same active row back.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn create_and_read_bean() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let created = service
        .create_bean(bean_request("Create Read", Some(250.0)))
        .await
        .expect("create bean");

    assert_eq!(created.name, "Create Read");
    assert_eq!(created.origin, "Ethiopia");
    assert_eq!(created.remaining_grams, Some(250.0));
    assert!(created.is_active, "new beans are active");

    let fetched = service
        .get_bean(created.id)
        .await
        .expect("get bean")
        .expect("bean exists");
    assert_eq!(fetched.id, created.id);
    assert_eq!(fetched.name, "Create Read");

    service.delete_bean(created.id).await.ok();
}

/// `update_bean` edits the mutable fields and returns the updated row; a later
/// `get_bean` confirms the change persisted. Exercises the shipping UPDATE
/// column list and `RETURNING` mapping.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn edit_bean_updates_fields() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let created = service
        .create_bean(bean_request("Before Edit", Some(250.0)))
        .await
        .expect("create bean");

    let updated = service
        .update_bean(created.id, bean_request("After Edit", Some(100.0)))
        .await
        .expect("update bean")
        .expect("bean exists for update");

    assert_eq!(updated.id, created.id);
    assert_eq!(updated.name, "After Edit");
    assert_eq!(updated.remaining_grams, Some(100.0));

    // The change is durable: a fresh read observes the edit.
    let fetched = service
        .get_bean(created.id)
        .await
        .expect("get bean")
        .expect("bean exists");
    assert_eq!(fetched.name, "After Edit");
    assert_eq!(fetched.remaining_grams, Some(100.0));

    service.delete_bean(created.id).await.ok();
}

/// `delete_bean` is a SOFT delete: the row is retained with `is_active = false`
/// and its brewing sessions are preserved; `get_bean` (which filters to active
/// beans) stops returning it. Exercises the shipping soft-delete UPDATE.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn soft_delete_preserves_brewing_sessions() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);
    let grinder_id = insert_grinder(&pool).await;

    let bean = service
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
    .bind(bean.id)
    .bind(grinder_id)
    .execute(&pool)
    .await
    .expect("insert session");

    // Soft-delete the bean through the real service.
    let deleted = service.delete_bean(bean.id).await.expect("soft delete");
    assert!(deleted, "soft delete reports it affected the row");

    // The active read no longer returns it (it is inactive now).
    let active_read = service.get_bean(bean.id).await.expect("get bean");
    assert!(
        active_read.is_none(),
        "soft-deleted bean is excluded from the active read"
    );

    // But the row itself is retained with is_active = false.
    let bean_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM coffee_beans WHERE id = $1 AND is_active = false)",
    )
    .bind(bean.id)
    .fetch_one(&pool)
    .await
    .expect("query bean existence");
    assert!(bean_exists, "soft-deleted bean row must be retained");

    // Its brewing session is preserved.
    let session_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM brewing_sessions WHERE id = $1)")
            .bind(session_id)
            .fetch_one(&pool)
            .await
            .expect("query session existence");
    assert!(session_exists, "soft delete must not drop brewing sessions");

    sqlx::query("DELETE FROM brewing_sessions WHERE id = $1")
        .bind(session_id)
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(bean.id)
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM grinders WHERE id = $1")
        .bind(grinder_id)
        .execute(&pool)
        .await
        .ok();
}

/// `get_active_beans` excludes soft-deleted beans AND zero-quantity bags while
/// keeping active, in-stock beans. Exercises the shipping
/// `is_active = true AND (remaining_grams > 0 OR remaining_grams IS NULL)`
/// filter.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn active_list_excludes_soft_deleted_and_empty_bags() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let active = service
        .create_bean(bean_request("Active Bag", Some(250.0)))
        .await
        .expect("create active bean");
    let empty = service
        .create_bean(bean_request("Empty Bag", Some(0.0)))
        .await
        .expect("create empty bean");
    let untracked = service
        .create_bean(bean_request("Untracked Bag", None))
        .await
        .expect("create untracked bean");
    let deleted = service
        .create_bean(bean_request("Deleted Bag", Some(250.0)))
        .await
        .expect("create to-be-deleted bean");
    service.delete_bean(deleted.id).await.expect("soft delete");

    let ids: Vec<Uuid> = service
        .get_active_beans()
        .await
        .expect("active list")
        .into_iter()
        .map(|b| b.id)
        .collect();

    assert!(ids.contains(&active.id), "active, in-stock bean must appear");
    assert!(
        ids.contains(&untracked.id),
        "untracked (NULL grams) bean must appear"
    );
    assert!(
        !ids.contains(&empty.id),
        "zero-quantity bean must be excluded"
    );
    assert!(
        !ids.contains(&deleted.id),
        "soft-deleted bean must be excluded"
    );

    for id in [active.id, empty.id, untracked.id, deleted.id] {
        sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .ok();
    }
}

/// `get_bean_usage_history` reports each brewing session for a bean with the
/// grams used, rating, grinder full name and method. Exercises the shipping
/// JOIN and the `brewing_method::text` cast that `BeanUsageRecord` requires.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn usage_history_reports_sessions() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);
    let grinder_id = insert_grinder(&pool).await;

    let bean = service
        .create_bean(bean_request("Usage History", Some(250.0)))
        .await
        .expect("create bean");

    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams, rating)
           VALUES ($1, $2, $3, 'V60', 20, 18.0, 288.0, 8.0)"#,
    )
    .bind(session_id)
    .bind(bean.id)
    .bind(grinder_id)
    .execute(&pool)
    .await
    .expect("insert session");

    let history = service
        .get_bean_usage_history(bean.id)
        .await
        .expect("usage history");

    assert_eq!(history.len(), 1);
    let record = &history[0];
    assert_eq!(record.session_id, session_id);
    assert_eq!(record.grams_used, 18.0);
    assert_eq!(record.rating, Some(8.0));
    assert_eq!(record.grinder_used, "Comandante C40");
    assert_eq!(record.brewing_method, "V60");

    sqlx::query("DELETE FROM brewing_sessions WHERE id = $1")
        .bind(session_id)
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(bean.id)
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM grinders WHERE id = $1")
        .bind(grinder_id)
        .execute(&pool)
        .await
        .ok();
}

/// Ticket #166: the SERVICE is the authoritative invariant seam. A direct
/// `create_bean`/`update_bean` with invalid data (empty name, or a future
/// roast date) must fail at the service layer, independent of the HTTP handler,
/// and persist NOTHING. The `COUNT(*)` before/after proves the reject happens
/// before any INSERT, so a non-HTTP caller cannot bypass validation.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn create_bean_rejects_invalid_data_at_service_layer() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let before: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM coffee_beans")
        .fetch_one(&pool)
        .await
        .expect("count beans");

    // Empty name is a business-rule violation caught by the service.
    let empty_name = service.create_bean(bean_request("   ", Some(250.0))).await;
    assert!(empty_name.is_err(), "service rejects an empty bean name");

    // A future roast date is rejected by the service before any INSERT.
    let mut future = bean_request("Future Roast", Some(250.0));
    future.roast_date = Utc::now().naive_utc().date() + Duration::days(1);
    let future_result = service.create_bean(future).await;
    assert!(future_result.is_err(), "service rejects a future roast date");

    let after: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM coffee_beans")
        .fetch_one(&pool)
        .await
        .expect("count beans");
    assert_eq!(
        before, after,
        "no invalid bean row is persisted when the service rejects it"
    );
}

/// Ticket #166: `update_bean` enforces the same invariants at the service
/// layer. Updating an existing bean with invalid data must fail without
/// mutating the stored row.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn update_bean_rejects_invalid_data_at_service_layer() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    let created = service
        .create_bean(bean_request("Original Name", Some(250.0)))
        .await
        .expect("create bean");

    let result = service
        .update_bean(created.id, bean_request("  ", Some(250.0)))
        .await;
    assert!(result.is_err(), "service rejects an empty name on update");

    // The stored row is unchanged.
    let fetched = service
        .get_bean(created.id)
        .await
        .expect("get bean")
        .expect("bean still exists");
    assert_eq!(
        fetched.name, "Original Name",
        "a rejected update does not mutate the row"
    );

    service.delete_bean(created.id).await.ok();
}

/// Ticket #139: the `roast_date <= purchase_date` CHECK is GONE **and only
/// that CHECK** — the `remaining_grams >= 0` CHECK must survive.
///
/// After migration `0003_drop_roast_before_purchase_check.sql`, the database no
/// longer forbids a bean whose `purchase_date` precedes its `roast_date` (a
/// bean roasted-to-order can be bought before it is roasted), so a
/// `create_bean` with such dates must succeed. The application still rejects
/// FUTURE dates via `validate_bean_fields`, which this test also pins down:
/// purchase-before-roast with both dates in the past validates, while a future
/// roast date is still rejected. The two guarantees are independent.
///
/// Migration 0003 drops the roast/purchase CHECK by its Postgres auto-generated
/// name `coffee_beans_check`. That name is implementation-defined, so a drift
/// in `coffee_beans`'s unnamed CHECKs could make the migration drop the wrong
/// constraint (or, via a future over-broad migration, more than intended)
/// without the drop-only assertions above noticing. To close that gap this test
/// ALSO re-asserts that the OTHER table-level CHECK survived: a raw INSERT with
/// a negative `remaining_grams` must still be rejected by the database. If a
/// migration ever over-dropped and removed `coffee_beans_remaining_grams_check`
/// too, this insert would wrongly succeed and fail the test.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn purchase_before_roast_is_allowed_at_db_level_but_future_dates_still_rejected() {
    let Some(pool) = pool().await else { return };
    let service = BeanService::new(&pool);

    // Dates in the past, but purchase BEFORE roast (what the old CHECK forbade).
    let today = Utc::now().naive_utc().date();
    let roast = today - Duration::days(2);
    let purchase = today - Duration::days(5); // earlier than the roast date

    // (1) The DB now accepts purchase-before-roast through the real service.
    let mut request = bean_request("Roasted To Order", Some(250.0));
    request.origin = "Colombia".to_string();
    request.roast_date = roast;
    request.purchase_date = purchase;

    let created = service
        .create_bean(request)
        .await
        .expect("purchase-before-roast must be accepted now that the CHECK is dropped");
    assert_eq!(created.roast_date, roast);
    assert_eq!(created.purchase_date, purchase);
    assert!(
        created.purchase_date < created.roast_date,
        "purchase precedes roast was persisted"
    );

    // (2) Application validation agrees: purchase-before-roast (both in the
    // past) is accepted; the cross-field ordering is not an application rule.
    assert!(
        validate_bean_fields("Roasted To Order", "Colombia", roast, purchase, Some(250.0)).is_ok(),
        "app validation must accept purchase-before-roast when both dates are in the past"
    );

    // (3) But a FUTURE roast date is still rejected by the application guard.
    let future_roast = today + Duration::days(1);
    assert!(
        matches!(
            validate_bean_fields(
                "Roasted To Order",
                "Colombia",
                future_roast,
                purchase,
                Some(250.0)
            ),
            Err(ValidationErrorType::RoastDateInFuture)
        ),
        "app validation must still reject a future roast date"
    );

    // (4) Migration 0003 must have dropped ONLY the roast/purchase CHECK. Prove
    // the sibling `remaining_grams >= 0` CHECK (auto-named
    // `coffee_beans_remaining_grams_check` in 0001) survived by attempting a raw
    // INSERT of a negative quantity straight at the table, bypassing the service
    // and app validation. The database itself must reject it; if an over-dropping
    // migration had also removed this CHECK, the INSERT would succeed and this
    // assertion would fail, catching the regression.
    let negative_grams_id = Uuid::new_v4();
    let insert_negative = sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams)
           VALUES ($1, 'Negative Grams', 'Brazil', $2, $3, -1.0)"#,
    )
    .bind(negative_grams_id)
    .bind(roast)
    .bind(purchase)
    .execute(&pool)
    .await;

    assert!(
        insert_negative.is_err(),
        "the remaining_grams >= 0 CHECK must still reject a negative quantity; \
         migration 0003 must not have over-dropped it"
    );
    // Belt-and-braces: nothing should have been persisted for that id.
    let leaked: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM coffee_beans WHERE id = $1)")
            .bind(negative_grams_id)
            .fetch_one(&pool)
            .await
            .expect("query negative-grams existence");
    assert!(
        !leaked,
        "the rejected negative-grams insert must not have persisted a row"
    );

    service.delete_bean(created.id).await.ok();
    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(created.id)
        .execute(&pool)
        .await
        .ok();
    // Defensive cleanup in case a regression allowed the negative row through.
    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(negative_grams_id)
        .execute(&pool)
        .await
        .ok();
}
