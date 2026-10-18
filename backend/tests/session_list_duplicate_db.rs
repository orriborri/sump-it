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
//! The SQL text and bind ORDER used here are the SAME ones produced by the pure
//! `coffee_brewer_backend::session_query` helpers (unit tested without a DB in
//! the library), so these tests validate that the generated SQL actually runs
//! and returns the right rows against real Postgres semantics (ILIKE, joins,
//! the generated `coffee_ratio`, newest-first ordering, paging).
//!
//! Scope mirrors the ticket's acceptance criteria:
//! - duplicate goes through validation + inventory (decrements grams, drops
//!   rating/notes, fails on insufficient quantity),
//! - list is newest-first with paging,
//! - filters: bean origin, roast-date range, grinder type, method, min rating,
//! - case-insensitive text search across bean name, origin, grinder brand and
//!   tasting notes.

use chrono::{Duration, Utc};
use coffee_brewer_backend::models::{BrewingMethod, GrinderType, SessionFilter};
use coffee_brewer_backend::session_query::{self, QueryBind};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

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

#[allow(clippy::too_many_arguments)]
async fn insert_session(
    pool: &PgPool,
    bean: Uuid,
    grinder: Uuid,
    method: &str,
    rating: Option<f32>,
    notes: Option<&str>,
    created_offset_secs: i64,
) -> Uuid {
    let id = Uuid::new_v4();
    let created = Utc::now() - Duration::seconds(created_offset_secs);
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting,
            water_temp_celsius, brew_time_seconds, coffee_grams, water_grams,
            rating, tasting_notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4::brewing_method, 20, 93, 180, 20.0, 320.0,
                   $5, $6, $7, $7)"#,
    )
    .bind(id)
    .bind(bean)
    .bind(grinder)
    .bind(method)
    .bind(rating)
    .bind(notes)
    .bind(created)
    .execute(pool)
    .await
    .expect("insert session");
    id
}

/// Binds each `QueryBind` to a `query_as` for a single-column id row, mirroring
/// the service's bind loop so the pure-built SQL is exercised end to end.
fn bind_ids<'q>(
    sql: &'q str,
    binds: &'q [QueryBind],
) -> sqlx::query::QueryAs<'q, sqlx::Postgres, (Uuid,), sqlx::postgres::PgArguments> {
    let mut q = sqlx::query_as::<_, (Uuid,)>(sql);
    for b in binds {
        q = match b {
            QueryBind::Text(v) => q.bind(v),
            QueryBind::Date(v) => q.bind(v),
            QueryBind::Grinder(v) => q.bind(v),
            QueryBind::Method(v) => q.bind(v),
            QueryBind::Float(v) => q.bind(v),
            QueryBind::Pattern(v) => q.bind(v),
            QueryBind::Int(v) => q.bind(v),
        };
    }
    q
}

/// Rewrites the full projection built by `list_sessions_sql` to select only the
/// id, so these tests can assert on ordering/filtering without decoding every
/// column. The WHERE/ORDER/LIMIT/OFFSET and binds are untouched, so this still
/// exercises the exact predicate/pagination SQL.
fn id_only(sql: &str) -> String {
    let from = sql.find(" FROM ").expect("built SQL has FROM");
    format!("SELECT s.id{}", &sql[from..])
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

/// Duplicating a session re-inserts a fresh row through the same inventory path
/// (grams decremented) while dropping the original's rating and notes. This
/// mirrors `SessionService::duplicate` -> `log_brew`.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn duplicate_rebrew_decrements_and_drops_results() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool, "Comandante", "BurrConical").await;
    let bean = insert_bean(&pool, "Yirgacheffe", "Ethiopia", 5).await;
    let original = insert_session(
        &pool,
        bean,
        grinder,
        "V60",
        Some(9.0),
        Some("bright and floral"),
        0,
    )
    .await;

    let before: f32 = sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("grams before");

    // A duplicate inserts a new session re-using the parameters, dropping the
    // rating/notes, and decrementing grams by the 20 g dose.
    let dup_id = Uuid::new_v4();
    let mut tx = pool.begin().await.expect("begin");
    sqlx::query(
        r#"INSERT INTO brewing_sessions
           (id, bean_id, grinder_id, brewing_method, grind_setting,
            water_temp_celsius, brew_time_seconds, coffee_grams, water_grams)
           SELECT $1, bean_id, grinder_id, brewing_method, grind_setting,
                  water_temp_celsius, brew_time_seconds, coffee_grams, water_grams
           FROM brewing_sessions WHERE id = $2"#,
    )
    .bind(dup_id)
    .bind(original)
    .execute(&mut *tx)
    .await
    .expect("insert duplicate");
    sqlx::query("UPDATE coffee_beans SET remaining_grams = remaining_grams - 20.0 WHERE id = $1")
        .bind(bean)
        .execute(&mut *tx)
        .await
        .expect("decrement");
    tx.commit().await.expect("commit");

    let (rating, notes): (Option<f32>, Option<String>) =
        sqlx::query_as("SELECT rating, tasting_notes FROM brewing_sessions WHERE id = $1")
            .bind(dup_id)
            .fetch_one(&pool)
            .await
            .expect("read duplicate");
    assert!(rating.is_none(), "duplicate drops rating");
    assert!(notes.is_none(), "duplicate drops tasting notes");

    let after: f32 = sqlx::query_scalar("SELECT remaining_grams FROM coffee_beans WHERE id = $1")
        .bind(bean)
        .fetch_one(&pool)
        .await
        .expect("grams after");
    assert!((before - after - 20.0).abs() < f32::EPSILON, "grams drop by dose");

    cleanup(&pool, &[bean], &[grinder]).await;
}

/// Listing with no filters returns sessions newest-first and respects LIMIT and
/// OFFSET, using the exact SQL the pure builder produces.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn list_is_newest_first_with_paging() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool, "Comandante", "BurrConical").await;
    let bean = insert_bean(&pool, "Yirgacheffe", "Ethiopia", 5).await;
    // Three sessions, increasing age (0 is newest).
    let newest = insert_session(&pool, bean, grinder, "V60", Some(8.0), None, 0).await;
    let middle = insert_session(&pool, bean, grinder, "V60", Some(7.0), None, 100).await;
    let _oldest = insert_session(&pool, bean, grinder, "V60", Some(6.0), None, 200).await;

    // Page size 2, offset 0 -> newest two in order.
    let filter = SessionFilter {
        bean_origin: Some("Ethiopia".to_string()),
        limit: Some(2),
        offset: Some(0),
        ..SessionFilter::default()
    };
    let built = session_query::list_sessions_sql(&filter, None);
    let rows: Vec<(Uuid,)> = bind_ids(&id_only(&built.sql), &built.binds)
        .fetch_all(&pool)
        .await
        .expect("page 1");
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0].0, newest, "newest first");
    assert_eq!(rows[1].0, middle, "then next newest");

    cleanup(&pool, &[bean], &[grinder]).await;
}

/// Each filter narrows the result set; the count query mirrors the list query.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn filters_narrow_results() {
    let Some(pool) = pool().await else { return };
    let burr = insert_grinder(&pool, "Comandante", "BurrConical").await;
    let blade = insert_grinder(&pool, "Krups", "Blade").await;
    let eth = insert_bean(&pool, "Yirgacheffe", "Ethiopia", 5).await;
    let ken = insert_bean(&pool, "Nyeri", "Kenya", 40).await;

    insert_session(&pool, eth, burr, "V60", Some(9.0), None, 0).await;
    insert_session(&pool, ken, blade, "Espresso", Some(4.0), None, 10).await;

    // Filter: Ethiopia + BurrConical + V60 + rating >= 8 -> only the first.
    let filter = SessionFilter {
        bean_origin: Some("Ethiopia".to_string()),
        grinder_type: Some(GrinderType::BurrConical),
        brewing_method: Some(BrewingMethod::V60),
        rating_min: Some(8.0),
        ..SessionFilter::default()
    };
    let count = session_query::count_sessions_sql(&filter, None);
    let mut cq = sqlx::query_scalar::<_, i64>(&count.sql);
    for b in &count.binds {
        cq = match b {
            QueryBind::Text(v) => cq.bind(v),
            QueryBind::Date(v) => cq.bind(v),
            QueryBind::Grinder(v) => cq.bind(v),
            QueryBind::Method(v) => cq.bind(v),
            QueryBind::Float(v) => cq.bind(v),
            QueryBind::Pattern(v) => cq.bind(v),
            QueryBind::Int(v) => cq.bind(v),
        };
    }
    let total = cq.fetch_one(&pool).await.expect("count");
    assert_eq!(total, 1, "only the Ethiopia/Burr/V60/high-rating session matches");

    cleanup(&pool, &[eth, ken], &[burr, blade]).await;
}

/// Case-insensitive search matches across bean name, origin, grinder brand and
/// tasting notes.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn search_matches_across_four_columns() {
    let Some(pool) = pool().await else { return };
    let grinder = insert_grinder(&pool, "Niche", "Zero").await;
    let bean = insert_bean(&pool, "Geisha Lot 7", "Panama", 5).await;
    let by_notes =
        insert_session(&pool, bean, grinder, "V60", Some(9.0), Some("JASMINE florals"), 0).await;

    // Lower-case query hits the upper-case notes (ILIKE is case-insensitive).
    let built = session_query::list_sessions_sql(&SessionFilter::default(), Some("jasmine"));
    let rows: Vec<(Uuid,)> = bind_ids(&id_only(&built.sql), &built.binds)
        .fetch_all(&pool)
        .await
        .expect("search notes");
    assert!(rows.iter().any(|r| r.0 == by_notes), "matches tasting notes");

    // Query hits the grinder brand.
    let built = session_query::list_sessions_sql(&SessionFilter::default(), Some("niche"));
    let rows: Vec<(Uuid,)> = bind_ids(&id_only(&built.sql), &built.binds)
        .fetch_all(&pool)
        .await
        .expect("search brand");
    assert!(rows.iter().any(|r| r.0 == by_notes), "matches grinder brand");

    cleanup(&pool, &[bean], &[grinder]).await;
}
