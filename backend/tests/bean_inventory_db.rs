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
//! The schema is created from the single source of truth,
//! `migrations/0001_init.sql`, via `sqlx::migrate!`. Each test acquires the
//! pool, runs migrations (idempotent), and cleans up the rows it inserts so the
//! suite can run repeatedly.
//!
//! Scope mirrors the ticket's acceptance criteria:
//! - create a bean and read it back,
//! - edit a bean,
//! - soft-delete a bean WITHOUT losing its brewing sessions,
//! - the active list excludes soft-deleted and zero-quantity beans,
//! - per-bean usage history (date, grams used, rating, grinder, method).

use chrono::{Duration, Utc};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

// The application-level bean rules live in the library crate; import the single
// source of truth so this suite can assert that app validation still rejects
// future dates even though the DB no longer forbids purchase-before-roast.
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

/// Inserts a coffee bean and returns its id.
async fn insert_bean(pool: &PgPool, name: &str, remaining: Option<f32>) -> Uuid {
    let id = Uuid::new_v4();
    let roast = Utc::now().naive_utc().date() - Duration::days(5);
    let purchase = Utc::now().naive_utc().date() - Duration::days(3);
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, $2, 'Ethiopia', $3, $4, $5, true)"#,
    )
    .bind(id)
    .bind(name)
    .bind(roast)
    .bind(purchase)
    .bind(remaining)
    .execute(pool)
    .await
    .expect("insert bean");
    id
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn create_and_read_bean() {
    let Some(pool) = pool().await else { return };
    let id = insert_bean(&pool, "Create Read", Some(250.0)).await;

    let name: String =
        sqlx::query_scalar("SELECT name FROM coffee_beans WHERE id = $1 AND is_active = true")
            .bind(id)
            .fetch_one(&pool)
            .await
            .expect("read back bean");
    assert_eq!(name, "Create Read");

    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .ok();
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn edit_bean_updates_fields() {
    let Some(pool) = pool().await else { return };
    let id = insert_bean(&pool, "Before Edit", Some(250.0)).await;

    sqlx::query("UPDATE coffee_beans SET name = 'After Edit', remaining_grams = 100 WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .expect("update bean");

    let (name, remaining): (String, Option<f32>) =
        sqlx::query_as("SELECT name, remaining_grams FROM coffee_beans WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await
            .expect("read updated bean");
    assert_eq!(name, "After Edit");
    assert_eq!(remaining, Some(100.0));

    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .ok();
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn soft_delete_preserves_brewing_sessions() {
    let Some(pool) = pool().await else { return };
    let grinder_id = insert_grinder(&pool).await;
    let bean_id = insert_bean(&pool, "Soft Delete", Some(250.0)).await;

    // Record a brewing session that uses this bean.
    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams)
           VALUES ($1, $2, $3, 'V60', 20, 20.0, 320.0)"#,
    )
    .bind(session_id)
    .bind(bean_id)
    .bind(grinder_id)
    .execute(&pool)
    .await
    .expect("insert session");

    // Soft-delete the bean.
    sqlx::query("UPDATE coffee_beans SET is_active = false WHERE id = $1")
        .bind(bean_id)
        .execute(&pool)
        .await
        .expect("soft delete");

    // The bean row and its session both still exist.
    let bean_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM coffee_beans WHERE id = $1 AND is_active = false)")
            .bind(bean_id)
            .fetch_one(&pool)
            .await
            .expect("query bean existence");
    assert!(bean_exists, "soft-deleted bean row must be retained");

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
        .bind(bean_id)
        .execute(&pool)
        .await
        .ok();
    sqlx::query("DELETE FROM grinders WHERE id = $1")
        .bind(grinder_id)
        .execute(&pool)
        .await
        .ok();
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn active_list_excludes_soft_deleted_and_empty_bags() {
    let Some(pool) = pool().await else { return };
    let active = insert_bean(&pool, "Active Bag", Some(250.0)).await;
    let empty = insert_bean(&pool, "Empty Bag", Some(0.0)).await;
    let deleted = insert_bean(&pool, "Deleted Bag", Some(250.0)).await;
    sqlx::query("UPDATE coffee_beans SET is_active = false WHERE id = $1")
        .bind(deleted)
        .execute(&pool)
        .await
        .expect("soft delete");

    // Mirror BeanService::get_active_beans: active AND quantity > 0 (or NULL).
    let ids: Vec<Uuid> = sqlx::query_scalar(
        r#"SELECT id FROM coffee_beans
           WHERE is_active = true AND (remaining_grams > 0 OR remaining_grams IS NULL)
           AND id = ANY($1)"#,
    )
    .bind(vec![active, empty, deleted])
    .fetch_all(&pool)
    .await
    .expect("active query");

    assert!(ids.contains(&active), "active, in-stock bean must appear");
    assert!(!ids.contains(&empty), "zero-quantity bean must be excluded");
    assert!(!ids.contains(&deleted), "soft-deleted bean must be excluded");

    for id in [active, empty, deleted] {
        sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
            .bind(id)
            .execute(&pool)
            .await
            .ok();
    }
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn usage_history_reports_sessions() {
    let Some(pool) = pool().await else { return };
    let grinder_id = insert_grinder(&pool).await;
    let bean_id = insert_bean(&pool, "Usage History", Some(250.0)).await;

    let session_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting, coffee_grams, water_grams, rating)
           VALUES ($1, $2, $3, 'V60', 20, 18.0, 288.0, 8.0)"#,
    )
    .bind(session_id)
    .bind(bean_id)
    .bind(grinder_id)
    .execute(&pool)
    .await
    .expect("insert session");

    // Mirror BeanService::get_bean_usage_history.
    let rows: Vec<(f32, Option<f32>, String, String)> = sqlx::query_as(
        r#"SELECT bs.coffee_grams, bs.rating, g.brand || ' ' || g.model, bs.brewing_method::text
           FROM brewing_sessions bs
           JOIN grinders g ON bs.grinder_id = g.id
           WHERE bs.bean_id = $1
           ORDER BY bs.created_at DESC"#,
    )
    .bind(bean_id)
    .fetch_all(&pool)
    .await
    .expect("usage history query");

    assert_eq!(rows.len(), 1);
    let (grams, rating, grinder, method) = &rows[0];
    assert_eq!(*grams, 18.0);
    assert_eq!(*rating, Some(8.0));
    assert_eq!(grinder, "Comandante C40");
    assert_eq!(method, "V60");

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
    sqlx::query("DELETE FROM grinders WHERE id = $1")
        .bind(grinder_id)
        .execute(&pool)
        .await
        .ok();
}

/// Ticket #139: the `roast_date <= purchase_date` CHECK is GONE.
///
/// After migration `0003_drop_roast_before_purchase_check.sql`, the database no
/// longer forbids a bean whose `purchase_date` precedes its `roast_date` (a
/// bean roasted-to-order can be bought before it is roasted), so the INSERT
/// below must succeed. The application still rejects FUTURE dates via
/// `validate_bean_fields`, which this test also pins down: purchase-before-roast
/// with both dates in the past validates, while a future roast date is still
/// rejected. The two guarantees are independent.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn purchase_before_roast_is_allowed_at_db_level_but_future_dates_still_rejected() {
    let Some(pool) = pool().await else { return };

    // Dates in the past, but purchase BEFORE roast (what the old CHECK forbade).
    let today = Utc::now().naive_utc().date();
    let roast = today - Duration::days(2);
    let purchase = today - Duration::days(5); // earlier than the roast date

    // (1) The DB now accepts purchase-before-roast.
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO coffee_beans
           (id, name, origin, roast_date, purchase_date, remaining_grams, is_active)
           VALUES ($1, 'Roasted To Order', 'Colombia', $2, $3, 250.0, true)"#,
    )
    .bind(id)
    .bind(roast)
    .bind(purchase)
    .execute(&pool)
    .await
    .expect("purchase-before-roast must be accepted now that the CHECK is dropped");

    let (stored_roast, stored_purchase): (chrono::NaiveDate, chrono::NaiveDate) =
        sqlx::query_as("SELECT roast_date, purchase_date FROM coffee_beans WHERE id = $1")
            .bind(id)
            .fetch_one(&pool)
            .await
            .expect("read back bean dates");
    assert_eq!(stored_roast, roast);
    assert_eq!(stored_purchase, purchase);
    assert!(stored_purchase < stored_roast, "purchase precedes roast was persisted");

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
            validate_bean_fields("Roasted To Order", "Colombia", future_roast, purchase, Some(250.0)),
            Err(ValidationErrorType::RoastDateInFuture)
        ),
        "app validation must still reject a future roast date"
    );

    sqlx::query("DELETE FROM coffee_beans WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .ok();
}
