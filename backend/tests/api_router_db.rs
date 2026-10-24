//! End-to-end HTTP integration tests that drive the REAL axum router
//! (`coffee_brewer_backend::api::router`) in-process against a live Postgres.
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d so that
//! `cargo test` runs cleanly without a database. They are the coverage driver
//! for the DB-backed layers: because `api` and `services` now live in the
//! library crate, running `cargo llvm-cov` over this (and the other DB) suite
//! measures and gates the handlers, the service layer and their SQL at 100%
//! lines - not just the DB-free core.
//!
//! WHY GO THROUGH THE ROUTER: rather than calling services directly, each test
//! builds a `Request`, sends it through `api::router(pool)` via
//! `tower::ServiceExt::oneshot`, and asserts on the real HTTP status and JSON
//! body. That exercises the exact extractor wiring, the handler branches
//! (success / validation / not-found / conflict / server-error) and the single
//! `save_error_response` error-mapping site that ship in production.
//!
//! Run (reads `DATABASE_URL`, falling back to `TEST_DATABASE_URL`) with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test api_router_db -- --ignored --test-threads=1
//! ```
//!
//! Each test uses a uniquely named throwaway database (created from the
//! migrations) so the suite is isolated and repeatable.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::{Executor, PgPool};
use tower::ServiceExt;
use uuid::Uuid;

use coffee_brewer_backend::api;

/// Spins up a uniquely named throwaway database, applies the migrations, and
/// returns a pool connected to it. Returns `None` when no database URL is set
/// so the (ignored) tests degrade cleanly if invoked without configuration.
async fn setup_pool() -> Option<PgPool> {
    let base_url = std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("TEST_DATABASE_URL"))
        .ok()?;

    let db_name = format!("api_router_test_{}", Uuid::new_v4().simple());

    let admin = PgPoolOptions::new()
        .max_connections(1)
        .connect(&base_url)
        .await
        .expect("connect to admin database");
    admin
        .execute(format!("CREATE DATABASE {}", db_name).as_str())
        .await
        .expect("create test database");

    let test_url = swap_database(&base_url, &db_name);
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&test_url)
        .await
        .expect("connect to test database");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("run migrations");

    Some(pool)
}

/// Rewrites the database name in a Postgres connection URL.
fn swap_database(base_url: &str, db_name: &str) -> String {
    match base_url.rfind('/') {
        Some(idx) => format!("{}/{}", &base_url[..idx], db_name),
        None => format!("{}/{}", base_url, db_name),
    }
}

/// Sends a request through the real `/api` router and returns the status and
/// parsed JSON body (or `Value::Null` for an empty body).
async fn send(pool: &PgPool, method: &str, uri: &str, body: Option<Value>) -> (StatusCode, Value) {
    let app = api::router(pool.clone());
    let request = {
        let builder = Request::builder().method(method).uri(uri);
        match body {
            Some(value) => builder
                .header("content-type", "application/json")
                .body(Body::from(value.to_string()))
                .unwrap(),
            None => builder.body(Body::empty()).unwrap(),
        }
    };

    let response = app.oneshot(request).await.expect("router responds");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("collect body")
        .to_bytes();
    let json = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("parse JSON body")
    };
    (status, json)
}

/// Creates a grinder via the API and returns its id.
async fn create_grinder(pool: &PgPool) -> Uuid {
    let (status, body) = send(
        pool,
        "POST",
        "/grinders",
        Some(json!({
            "brand": "Comandante",
            "model": "C40",
            "grinderType": "BurrConical",
            "minSetting": 0,
            "maxSetting": 40,
            "scaleType": "step",
            "description": "Hand grinder"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "grinder create: {body}");
    parse_id(&body)
}

/// Creates a bean via the API with the given remaining grams and returns its id.
async fn create_bean(pool: &PgPool, remaining: Option<f32>) -> Uuid {
    let (status, body) = send(
        pool,
        "POST",
        "/beans",
        Some(json!({
            "name": "Yirgacheffe",
            "origin": "Ethiopia",
            "roastDate": "2024-01-01",
            "purchaseDate": "2024-01-03",
            "remainingGrams": remaining,
            "variety": "Heirloom",
            "processingMethod": "Washed"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "bean create: {body}");
    parse_id(&body)
}

fn parse_id(body: &Value) -> Uuid {
    Uuid::parse_str(body["id"].as_str().expect("id field")).expect("valid uuid")
}

/// A valid Espresso create-session request (18 g / 36 g, 93 C, 30 s).
fn espresso_body(bean: Uuid, grinder: Uuid) -> Value {
    json!({
        "beanId": bean,
        "grinderId": grinder,
        "brewingMethod": "Espresso",
        "grindSetting": 12,
        "waterTempCelsius": 93,
        "brewTimeSeconds": 30,
        "coffeeGrams": 18.0,
        "waterGrams": 36.0,
        "isTemplate": false
    })
}

// --------------------------------------------------------------------------
// Grinder handlers
// --------------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn grinder_crud_through_router() {
    let Some(pool) = setup_pool().await else { return };

    // Empty list first.
    let (status, body) = send(&pool, "GET", "/grinders", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 0);
    assert_eq!(body["page"], 1);
    assert_eq!(body["pageSize"], 50);

    // Create.
    let id = create_grinder(&pool).await;

    // Get by id.
    let (status, body) = send(&pool, "GET", &format!("/grinders/{id}"), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["brand"], "Comandante");

    // List with explicit paging reflects the row and `hasMore` maths.
    let (status, body) = send(&pool, "GET", "/grinders?page=1&limit=1", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 1);
    assert_eq!(body["hasMore"], false);

    // Update.
    let (status, body) = send(
        &pool,
        "PUT",
        &format!("/grinders/{id}"),
        Some(json!({
            "brand": "Comandante",
            "model": "C40 MK4",
            "grinderType": "Manual",
            "minSetting": 0,
            "maxSetting": 50,
            "scaleType": null,
            "description": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["model"], "C40 MK4");

    // Delete.
    let (status, body) = send(&pool, "DELETE", &format!("/grinders/{id}"), None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    assert_eq!(body, Value::Null);

    // Get / update / delete a now-missing grinder -> 404 on each.
    let (status, _) = send(&pool, "GET", &format!("/grinders/{id}"), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = send(
        &pool,
        "PUT",
        &format!("/grinders/{id}"),
        Some(json!({
            "brand": "Comandante",
            "model": "C40",
            "grinderType": "BurrConical",
            "minSetting": 0,
            "maxSetting": 40,
            "scaleType": null,
            "description": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = send(&pool, "DELETE", &format!("/grinders/{id}"), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn grinder_validation_errors_through_router() {
    let Some(pool) = setup_pool().await else { return };

    // Derive-based field validation failure (empty brand) -> 400 with details.
    let (status, body) = send(
        &pool,
        "POST",
        "/grinders",
        Some(json!({
            "brand": "",
            "model": "C40",
            "grinderType": "BurrConical",
            "minSetting": 0,
            "maxSetting": 40,
            "scaleType": null,
            "description": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "Validation failed");
    assert!(body["details"].is_array());

    // Domain setting-range failure (max <= min) -> 400. This hits
    // `validate_grinder_request`'s second branch for both create and update.
    let (status, _) = send(
        &pool,
        "POST",
        "/grinders",
        Some(json!({
            "brand": "Comandante",
            "model": "C40",
            "grinderType": "BurrConical",
            "minSetting": 40,
            "maxSetting": 40,
            "scaleType": null,
            "description": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let id = create_grinder(&pool).await;
    let (status, _) = send(
        &pool,
        "PUT",
        &format!("/grinders/{id}"),
        Some(json!({
            "brand": "Comandante",
            "model": "C40",
            "grinderType": "BurrConical",
            "minSetting": 40,
            "maxSetting": 40,
            "scaleType": null,
            "description": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Update with an empty brand -> the derive-validation branch of
    // `validate_grinder_request` on the update path.
    let (status, _) = send(
        &pool,
        "PUT",
        &format!("/grinders/{id}"),
        Some(json!({
            "brand": "",
            "model": "C40",
            "grinderType": "BurrConical",
            "minSetting": 0,
            "maxSetting": 40,
            "scaleType": null,
            "description": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// --------------------------------------------------------------------------
// Bean handlers
// --------------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn bean_crud_and_active_and_usage_through_router() {
    let Some(pool) = setup_pool().await else { return };

    // Empty list.
    let (status, body) = send(&pool, "GET", "/beans", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 0);

    // Create (tracked) and a second untracked bean.
    let tracked = create_bean(&pool, Some(250.0)).await;
    let _untracked = create_bean(&pool, None).await;

    // List with paging.
    let (status, body) = send(&pool, "GET", "/beans?page=1&limit=1", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 2);
    assert_eq!(body["hasMore"], true);

    // Get by id.
    let (status, body) = send(&pool, "GET", &format!("/beans/{tracked}"), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "Yirgacheffe");

    // Active list (both have >0 / NULL grams and are active).
    let (status, body) = send(&pool, "GET", "/beans/active", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().expect("array").len(), 2);

    // Update.
    let (status, body) = send(
        &pool,
        "PUT",
        &format!("/beans/{tracked}"),
        Some(json!({
            "name": "Yirgacheffe Reserve",
            "origin": "Ethiopia",
            "roastDate": "2024-01-01",
            "purchaseDate": "2024-01-03",
            "remainingGrams": 200.0,
            "variety": "Heirloom",
            "processingMethod": "Natural"
        })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "Yirgacheffe Reserve");

    // Usage history: brew once so there is a record, then read it back.
    let grinder = create_grinder(&pool).await;
    let (status, body) = send(&pool, "POST", "/sessions", Some(espresso_body(tracked, grinder))).await;
    assert_eq!(status, StatusCode::CREATED, "usage brew: {body}");
    let (status, body) = send(&pool, "GET", &format!("/beans/{tracked}/usage"), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().expect("array").len(), 1);

    // Delete (soft) then get -> 404, and the active list drops it.
    let (status, _) = send(&pool, "DELETE", &format!("/beans/{tracked}"), None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (status, _) = send(&pool, "GET", &format!("/beans/{tracked}"), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, _) = send(&pool, "DELETE", &format!("/beans/{tracked}"), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Update a now-deleted bean -> 404 (covers the `Ok(None)` update branch).
    let (status, _) = send(
        &pool,
        "PUT",
        &format!("/beans/{tracked}"),
        Some(json!({
            "name": "Ghost",
            "origin": "Ethiopia",
            "roastDate": "2024-01-01",
            "purchaseDate": "2024-01-03",
            "remainingGrams": 10.0,
            "variety": null,
            "processingMethod": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn bean_validation_errors_through_router() {
    let Some(pool) = setup_pool().await else { return };

    // Derive-validation failure (empty name) -> 400 with details.
    let (status, body) = send(
        &pool,
        "POST",
        "/beans",
        Some(json!({
            "name": "",
            "origin": "Ethiopia",
            "roastDate": "2024-01-01",
            "purchaseDate": "2024-01-03",
            "remainingGrams": 100.0,
            "variety": null,
            "processingMethod": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "Validation failed");

    // Business-rule failure (future roast date) -> 400 via
    // `validate_comprehensive` on both create and update.
    let future = (chrono::Utc::now().date_naive() + chrono::Duration::days(5)).to_string();
    let (status, _) = send(
        &pool,
        "POST",
        "/beans",
        Some(json!({
            "name": "Future Roast",
            "origin": "Ethiopia",
            "roastDate": future,
            "purchaseDate": "2024-01-03",
            "remainingGrams": 100.0,
            "variety": null,
            "processingMethod": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let id = create_bean(&pool, Some(100.0)).await;

    // Update with a derive-validation failure (empty origin).
    let (status, _) = send(
        &pool,
        "PUT",
        &format!("/beans/{id}"),
        Some(json!({
            "name": "Yirgacheffe",
            "origin": "",
            "roastDate": "2024-01-01",
            "purchaseDate": "2024-01-03",
            "remainingGrams": 100.0,
            "variety": null,
            "processingMethod": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Update with a business-rule failure (future purchase date).
    let (status, _) = send(
        &pool,
        "PUT",
        &format!("/beans/{id}"),
        Some(json!({
            "name": "Yirgacheffe",
            "origin": "Ethiopia",
            "roastDate": "2024-01-01",
            "purchaseDate": future,
            "remainingGrams": 100.0,
            "variety": null,
            "processingMethod": null
        })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// --------------------------------------------------------------------------
// Session handlers + the `save_error_response` mapping
// --------------------------------------------------------------------------

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn session_create_list_duplicate_through_router() {
    let Some(pool) = setup_pool().await else { return };
    let grinder = create_grinder(&pool).await;
    let bean = create_bean(&pool, Some(100.0)).await;

    // Create a valid session.
    let (status, body) = send(&pool, "POST", "/sessions", Some(espresso_body(bean, grinder))).await;
    assert_eq!(status, StatusCode::CREATED, "create session: {body}");
    let session_id = parse_id(&body);
    assert_eq!(body["coffeeRatio"], 2.0);

    // List (default), then with paging and a filter + search.
    let (status, body) = send(&pool, "GET", "/sessions", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 1);
    assert_eq!(body["page"], 1);

    let (status, body) = send(
        &pool,
        "GET",
        "/sessions?page=1&limit=1&brewingMethod=Espresso&beanOrigin=Ethiopia",
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["total"], 1);
    assert_eq!(body["hasMore"], false);

    // `offset` branch of `to_filter` plus text search `q`.
    let (status, body) = send(&pool, "GET", "/sessions?offset=0&q=Ethiopia", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["page"], 1);

    // Every filter field at once, plus a search term, so the service's
    // `bind_all` binder exercises ALL `QueryBind` variants (Text, Date,
    // Grinder, Method, Float, Pattern, Int) across the shared list + count
    // query pair.
    let (status, body) = send(
        &pool,
        "GET",
        "/sessions?beanOrigin=Ethiopia\
         &roastDateFrom=2020-01-01&roastDateTo=2030-01-01\
         &grinderType=BurrConical&brewingMethod=Espresso&ratingMin=0\
         &q=Ethiopia&limit=10&offset=0",
        None,
    )
    .await;
    // The query runs to completion (all binds encoded), which is the point of
    // this case; `ratingMin=0` excludes the unrated session, so the total is 0.
    assert_eq!(status, StatusCode::OK, "all-filters list: {body}");
    assert_eq!(body["total"], 0);

    // Duplicate the session: re-brews and decrements again.
    let (status, body) = send(
        &pool,
        "POST",
        &format!("/sessions/{session_id}/duplicate"),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "duplicate: {body}");
    assert!(body["rating"].is_null(), "duplicate drops rating");
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn session_error_mapping_through_router() {
    let Some(pool) = setup_pool().await else { return };
    let grinder = create_grinder(&pool).await;

    // (a) Request-shape validation failure (negative grind setting) -> 400.
    let mut bad = espresso_body(Uuid::new_v4(), grinder);
    bad["grindSetting"] = json!(-1);
    let (status, body) = send(&pool, "POST", "/sessions", Some(bad)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(body["error"], "Validation failed");

    // (b) Recipe violation (water temp out of the Espresso band) -> 400.
    //     Reaches `SaveError::Recipe` through the full save path, so a bean and
    //     grinder that both exist are required first.
    let bean = create_bean(&pool, Some(100.0)).await;
    let mut hot = espresso_body(bean, grinder);
    hot["waterTempCelsius"] = json!(50); // below the 88-96 C Espresso band
    let (status, _) = send(&pool, "POST", "/sessions", Some(hot)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // (c) Grinder not found -> 404 (`SaveError::GrinderNotFound`).
    let (status, body) = send(
        &pool,
        "POST",
        "/sessions",
        Some(espresso_body(bean, Uuid::new_v4())),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["error"], "Grinder not found");

    // (d) Bean not found -> 404 (`SaveError::BeanNotFound`).
    let (status, body) = send(
        &pool,
        "POST",
        "/sessions",
        Some(espresso_body(Uuid::new_v4(), grinder)),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["error"], "Coffee bean not found or inactive");

    // (e) Insufficient quantity -> 409 with available/required details
    //     (`SaveError::InsufficientQuantity`).
    let short = create_bean(&pool, Some(5.0)).await; // less than an 18 g dose
    let (status, body) = send(
        &pool,
        "POST",
        "/sessions",
        Some(espresso_body(short, grinder)),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert!(body["details"].is_array());

    // (f) Duplicate a missing session -> 404 (`SaveError::SessionNotFound`).
    let (status, body) = send(
        &pool,
        "POST",
        &format!("/sessions/{}/duplicate", Uuid::new_v4()),
        None,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["error"], "Brewing session not found");
}

// --------------------------------------------------------------------------
// Database-failure mapping: force the service queries to fail so the handlers'
// `Err(e) => 500` arms and the service's `SaveError::Database` / `.context`
// error-mapping closures are exercised (never excluded, per US43).
// --------------------------------------------------------------------------

/// Drops every application table so subsequent service queries fail at the DB.
async fn drop_all_tables(pool: &PgPool) {
    pool.execute(
        "DROP TABLE IF EXISTS brewing_sessions, coffee_beans, grinders CASCADE",
    )
    .await
    .expect("drop tables");
}

#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn every_handler_maps_db_errors_to_500() {
    let Some(pool) = setup_pool().await else { return };

    // Pre-create a grinder and a bean (used to reach the `log_brew` internal
    // query-failure branches) BEFORE the tables are dropped where needed.
    drop_all_tables(&pool).await;

    let id = Uuid::new_v4();
    let create_grinder_body = json!({
        "brand": "X", "model": "Y", "grinderType": "BurrConical",
        "minSetting": 0, "maxSetting": 40, "scaleType": null, "description": null
    });
    let create_bean_body = json!({
        "name": "X", "origin": "Y", "roastDate": "2024-01-01",
        "purchaseDate": "2024-01-03", "remainingGrams": 100.0,
        "variety": null, "processingMethod": null
    });

    // Grinder handlers: list, create, get, update, delete all hit a missing
    // table and map the service error to 500.
    for (method, uri, body) in [
        ("GET", "/grinders".to_string(), None),
        ("POST", "/grinders".to_string(), Some(create_grinder_body.clone())),
        ("GET", format!("/grinders/{id}"), None),
        ("PUT", format!("/grinders/{id}"), Some(create_grinder_body.clone())),
        ("DELETE", format!("/grinders/{id}"), None),
    ] {
        let (status, _) = send(&pool, method, &uri, body).await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR, "{method} {uri}");
    }

    // Bean handlers: list, create, get, update, delete, active, usage.
    for (method, uri, body) in [
        ("GET", "/beans".to_string(), None),
        ("POST", "/beans".to_string(), Some(create_bean_body.clone())),
        ("GET", format!("/beans/{id}"), None),
        ("PUT", format!("/beans/{id}"), Some(create_bean_body.clone())),
        ("DELETE", format!("/beans/{id}"), None),
        ("GET", "/beans/active".to_string(), None),
        ("GET", format!("/beans/{id}/usage"), None),
    ] {
        let (status, _) = send(&pool, method, &uri, body).await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR, "{method} {uri}");
    }

    // Session list handler maps a query failure to 500.
    let (status, _) = send(&pool, "GET", "/sessions", None).await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);

    // Session create -> `log_brew` fails on the FIRST query (`get_grinder`),
    // which maps to `SaveError::Database` -> 500 via `save_error_response`.
    let (status, body) = send(
        &pool,
        "POST",
        "/sessions",
        Some(espresso_body(id, id)),
    )
    .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .starts_with("Failed to save brewing session"),
        "database save error body: {body}"
    );
}

/// Forces the `log_brew` internal query-failure closures that sit AFTER the
/// grinder load: the bean-row lock and the session insert. Each is reached by
/// leaving the earlier tables intact and dropping only the one the failing
/// step touches, so the `#[path]`-free library service is exercised end to end.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); run with --ignored"]
async fn log_brew_internal_query_failures_map_to_database_error() {
    // (1) Lock-bean failure: grinder exists, `coffee_beans` is gone. The
    //     `get_grinder` load succeeds and the transaction begins, then the
    //     `SELECT ... FOR UPDATE` on `coffee_beans` fails.
    {
        let Some(pool) = setup_pool().await else { return };
        let grinder = create_grinder(&pool).await;
        pool.execute("DROP TABLE coffee_beans CASCADE")
            .await
            .expect("drop coffee_beans");

        let (status, body) = send(
            &pool,
            "POST",
            "/sessions",
            Some(espresso_body(Uuid::new_v4(), grinder)),
        )
        .await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR, "lock failure: {body}");
    }

    // (2) Insert failure: grinder AND a tracked bean exist, but
    //     `brewing_sessions` is gone. Validation passes, the bean row locks and
    //     has enough grams, then the session INSERT fails.
    {
        let Some(pool) = setup_pool().await else { return };
        let grinder = create_grinder(&pool).await;
        let bean = create_bean(&pool, Some(100.0)).await;
        pool.execute("DROP TABLE brewing_sessions CASCADE")
            .await
            .expect("drop brewing_sessions");

        let (status, body) = send(
            &pool,
            "POST",
            "/sessions",
            Some(espresso_body(bean, grinder)),
        )
        .await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR, "insert failure: {body}");
    }
}

/// Every list route must fetch and report the same normalized window.
#[tokio::test]
#[ignore = "requires a live Postgres"]
async fn list_pagination_metadata_uses_normalized_window() {
    let Some(pool) = setup_pool().await else { return };
    for _ in 0..3 {
        let grinder = create_grinder(&pool).await;
        let bean = create_bean(&pool, None).await;
        let (status, _) = send(&pool, "POST", "/sessions", Some(espresso_body(bean, grinder))).await;
        assert_eq!(status, StatusCode::CREATED);
    }

    for endpoint in ["beans", "grinders", "sessions"] {
        for (limit, size) in [(0, 1), (-5, 1), (101, 100)] {
            for (query, page, count, more) in [
                ("page=1", 1, if size == 1 { 1 } else { 3 }, size == 1),
                ("page=2", 2, if size == 1 { 1 } else { 0 }, size == 1),
                ("page=3", 3, if size == 1 { 1 } else { 0 }, false),
            ] {
                let uri = format!("/{endpoint}?{query}&limit={limit}");
                let (status, body) = send(&pool, "GET", &uri, None).await;
                assert_eq!(status, StatusCode::OK, "{uri}: {body}");
                assert_eq!(body["total"], 3, "{uri}");
                assert_eq!(body["page"], page, "{uri}");
                assert_eq!(body["pageSize"], size, "{uri}");
                assert_eq!(body["hasMore"], more, "{uri}");
                assert_eq!(body["items"].as_array().unwrap().len(), count, "{uri}");
            }
        }
    }

    // Explicit offsets take precedence over page and need not align to a page.
    let (status, body) = send(&pool, "GET", "/sessions?page=99&offset=1&limit=0", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["page"], 2);
    assert_eq!(body["pageSize"], 1);
    assert_eq!(body["hasMore"], true);
    assert_eq!(body["items"].as_array().unwrap().len(), 1);
}
