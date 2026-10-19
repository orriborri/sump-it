//! In-process HTTP integration tests for tickets #145 and #146.
//!
//! THE SPEC'S DECLARED PRIMARY TEST SEAM. The other DB tests
//! (`bean_inventory_db.rs`, `session_logging_db.rs`,
//! `session_list_duplicate_db.rs`) drive the production SERVICES directly. This
//! file drives the production HTTP HANDLERS instead: it builds the REAL Axum
//! application via `api::router(pool)` and sends requests through it with
//! tower's `ServiceExt::oneshot`, so the full request -> handler -> service ->
//! Postgres -> response path (including serde (de)serialization, route
//! dispatch, status codes and the `SaveError` -> HTTP mapping) is exercised
//! exactly as a client observes it. A route, status code or error-mapping drift
//! in `backend/src/api/*.rs` fails here.
//!
//! THESE TESTS REQUIRE A LIVE POSTGRES and are therefore `#[ignore]`d, matching
//! the repo convention that DB-backed integration tests are opt-in via
//! `--ignored`. Run them with:
//!
//! ```sh
//! export DATABASE_URL=postgres://user:pass@localhost:5432/coffee
//! cargo test --test http_api_db -- --ignored --test-threads=1
//! ```
//!
//! WHY THIS COMPILES THE REAL ROUTER: `api::router`/`AppState` live in the
//! binary target, not the library crate, so they cannot be imported. As with
//! the service tests, the binary modules are compiled into this test crate via
//! the `#[path]` include pattern; the `crate::`-relative paths inside the api
//! and service sources then resolve to the library re-exports declared below,
//! exactly as they do in `main.rs`.

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tower::ServiceExt; // for `oneshot`
use uuid::Uuid;

// Re-export the library modules under the `crate::` paths the binary sources
// expect (mirrors `main.rs`), so the `#[path]`-included `services` and `api`
// modules compile unchanged inside this test crate.
#[allow(unused_imports)]
use coffee_brewer_backend::{models, recipe, session_query, validation};

// Compile the ACTUAL production service and api layers into this test crate.
// `api/mod.rs` declares its `beans`/`grinders`/`sessions` submodules relative
// to `../src/api/`, and references `crate::services::*`, `crate::models::*`,
// etc., all of which resolve against the re-exports above and the `services`
// module below. `dead_code`/`unused` are allowed because the test exercises the
// surface through HTTP, so some service/handler helpers look unused to the
// compiler when built into the test crate rather than the binary.
#[allow(dead_code)]
#[path = "../src/services/mod.rs"]
mod services;

#[allow(dead_code)]
#[path = "../src/api/mod.rs"]
mod api;

use axum::Router;

/// Connects to `DATABASE_URL`, runs the migrations and returns the pool.
/// Returns `None` when the variable is unset so the (ignored) tests degrade
/// cleanly instead of panicking.
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

/// Builds the REAL application the same way `main.rs` does: the API router
/// (which nests `/beans`, `/grinders`, `/sessions`) mounted under `/api`, so
/// request paths here match the shipping URLs (`/api/beans`, ...).
fn app(pool: PgPool) -> Router {
    Router::new().nest("/api", api::router(pool))
}

/// Sends one request through the router and returns `(status, json_body)`.
///
/// The body is always parsed as JSON except for `204 No Content`, which has an
/// empty body and so yields `Value::Null`.
async fn send(app: &Router, request: Request<Body>) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(request)
        .await
        .expect("router handles the request");
    let status = response.status();
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("collect response body")
        .to_bytes();
    let body = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("response body is valid JSON")
    };
    (status, body)
}

/// POSTs a JSON body to `path`.
fn post(path: &str, body: &Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri(path)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("build POST request")
}

/// PUTs a JSON body to `path`.
fn put(path: &str, body: &Value) -> Request<Body> {
    Request::builder()
        .method("PUT")
        .uri(path)
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .expect("build PUT request")
}

/// GETs `path`.
fn get(path: &str) -> Request<Body> {
    Request::builder()
        .method("GET")
        .uri(path)
        .body(Body::empty())
        .expect("build GET request")
}

/// DELETEs `path`.
fn delete(path: &str) -> Request<Body> {
    Request::builder()
        .method("DELETE")
        .uri(path)
        .body(Body::empty())
        .expect("build DELETE request")
}

/// A valid grinder create body (0-40 burr range).
fn grinder_body() -> Value {
    json!({
        "brand": "Comandante",
        "model": "C40",
        "grinderType": "BurrConical",
        "minSetting": 0,
        "maxSetting": 40,
        "scaleType": "step",
        "description": "Hand grinder"
    })
}

/// A valid bean create body with a tracked quantity and dates in the past.
/// `remaining` becomes the tracked grams; `origin` is a per-test unique string
/// so list/filter assertions are scoped to this test's rows.
fn bean_body(origin: &str, remaining: f32) -> Value {
    let today = chrono::Utc::now().naive_utc().date();
    let roast = today - chrono::Duration::days(5);
    let purchase = today - chrono::Duration::days(3);
    json!({
        "name": "Yirgacheffe",
        "origin": origin,
        "roastDate": roast.to_string(),
        "purchaseDate": purchase.to_string(),
        "remainingGrams": remaining,
        "variety": "Heirloom",
        "processingMethod": "Washed"
    })
}

/// Deletes every row the tests might have created for the given ids, in reverse
/// FK order, so the suite is rerunnable.
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
        sqlx::query("DELETE FROM brewing_sessions WHERE grinder_id = $1")
            .bind(g)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM grinders WHERE id = $1")
            .bind(g)
            .execute(pool)
            .await
            .ok();
    }
}

/// Reads a UUID field out of a JSON object.
fn id_of(value: &Value) -> Uuid {
    Uuid::parse_str(value["id"].as_str().expect("id is a string")).expect("id is a UUID")
}

/// End-to-end bean lifecycle through HTTP: create a grinder and a bean (201),
/// list them, fetch `/active`, read usage, update and soft-delete the bean, and
/// confirm the soft-deleted bean is then `404`.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn bean_lifecycle_through_http() {
    let Some(pool) = pool().await else { return };
    let app = app(pool.clone());
    let origin = format!("Ethiopia-{}", Uuid::new_v4());

    // Create a grinder (201 Created) and read its id back from the body.
    let (status, grinder) = send(&app, post("/api/grinders", &grinder_body())).await;
    assert_eq!(status, StatusCode::CREATED, "grinder create is 201");
    let grinder_id = id_of(&grinder);
    assert_eq!(grinder["brand"], "Comandante");

    // Create a bean (201 Created).
    let (status, bean) = send(&app, post("/api/beans", &bean_body(&origin, 100.0))).await;
    assert_eq!(status, StatusCode::CREATED, "bean create is 201");
    let bean_id = id_of(&bean);
    assert_eq!(bean["origin"], origin);
    assert_eq!(bean["remainingGrams"], 100.0);
    assert_eq!(bean["isActive"], true);

    // GET the bean back (200).
    let (status, fetched) = send(&app, get(&format!("/api/beans/{bean_id}"))).await;
    assert_eq!(status, StatusCode::OK, "GET bean is 200");
    assert_eq!(id_of(&fetched), bean_id);

    // List beans: the paginated envelope carries our bean.
    let (status, list) = send(&app, get("/api/beans")).await;
    assert_eq!(status, StatusCode::OK, "list beans is 200");
    let items = list["items"].as_array().expect("items array");
    assert!(
        items.iter().any(|b| id_of(b) == bean_id),
        "listed beans include the created bean"
    );

    // /active lists active, in-stock beans (flat array).
    let (status, active) = send(&app, get("/api/beans/active")).await;
    assert_eq!(status, StatusCode::OK, "active beans is 200");
    let active_items = active.as_array().expect("active is a flat array");
    assert!(
        active_items.iter().any(|b| id_of(b) == bean_id),
        "active beans include the in-stock bean"
    );

    // Usage history is initially empty for a brand-new bean (200, []).
    let (status, usage) = send(&app, get(&format!("/api/beans/{bean_id}/usage"))).await;
    assert_eq!(status, StatusCode::OK, "usage is 200");
    assert_eq!(
        usage.as_array().expect("usage is an array").len(),
        0,
        "no usage before any brew"
    );

    // Update the bean (200) and confirm the edit persisted.
    let mut edit = bean_body(&origin, 250.0);
    edit["name"] = json!("Yirgacheffe Reserve");
    let (status, updated) = send(&app, put(&format!("/api/beans/{bean_id}"), &edit)).await;
    assert_eq!(status, StatusCode::OK, "update bean is 200");
    assert_eq!(updated["name"], "Yirgacheffe Reserve");
    assert_eq!(updated["remainingGrams"], 250.0);

    // Soft-delete the bean (204 No Content, empty body).
    let (status, body) = send(&app, delete(&format!("/api/beans/{bean_id}"))).await;
    assert_eq!(status, StatusCode::NO_CONTENT, "delete bean is 204");
    assert_eq!(body, Value::Null, "204 has an empty body");

    // After soft-delete the bean is hidden: GET is 404.
    let (status, _) = send(&app, get(&format!("/api/beans/{bean_id}"))).await;
    assert_eq!(status, StatusCode::NOT_FOUND, "soft-deleted bean is 404");

    // Deleting again is a no-op that maps to 404.
    let (status, _) = send(&app, delete(&format!("/api/beans/{bean_id}"))).await;
    assert_eq!(status, StatusCode::NOT_FOUND, "re-delete is 404");

    cleanup(&pool, &[bean_id], &[grinder_id]).await;
}

/// Logging an Espresso brew through HTTP returns 201 with `coffeeRatio` 2.0,
/// decrements the bean's tracked grams (observable through `/api/beans/active`),
/// and records a usage row.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn log_espresso_session_decrements_inventory_through_http() {
    let Some(pool) = pool().await else { return };
    let app = app(pool.clone());
    let origin = format!("Brazil-{}", Uuid::new_v4());

    let (_, grinder) = send(&app, post("/api/grinders", &grinder_body())).await;
    let grinder_id = id_of(&grinder);
    let (_, bean) = send(&app, post("/api/beans", &bean_body(&origin, 100.0))).await;
    let bean_id = id_of(&bean);

    // Log a valid Espresso brew: 18 g / 36 g (ratio 2.0), 93 C, 30 s.
    let session_body = json!({
        "beanId": bean_id,
        "grinderId": grinder_id,
        "brewingMethod": "Espresso",
        "grindSetting": 12,
        "waterTempCelsius": 93,
        "brewTimeSeconds": 30,
        "coffeeGrams": 18.0,
        "waterGrams": 36.0,
        "tastingNotes": "Syrupy chocolate",
        "rating": 8.0,
        "isTemplate": false
    });
    let (status, session) = send(&app, post("/api/sessions", &session_body)).await;
    assert_eq!(status, StatusCode::CREATED, "session create is 201");
    assert_eq!(session["beanId"], bean_id.to_string());
    assert_eq!(session["coffeeGrams"], 18.0);
    assert_eq!(session["waterGrams"], 36.0);
    assert_eq!(
        session["coffeeRatio"], 2.0,
        "generated coffeeRatio must be 2.0"
    );

    // The bean's remaining grams dropped by exactly the 18 g dose. Read it back
    // through /active (the bean is still active and in stock).
    let (status, active) = send(&app, get("/api/beans/active")).await;
    assert_eq!(status, StatusCode::OK);
    let our_bean = active
        .as_array()
        .expect("active array")
        .iter()
        .find(|b| id_of(b) == bean_id)
        .expect("bean still active");
    assert_eq!(
        our_bean["remainingGrams"], 82.0,
        "100 g - 18 g dose = 82 g remaining"
    );

    // Usage history now reports the brew via the handler's JOIN mapping.
    let (status, usage) = send(&app, get(&format!("/api/beans/{bean_id}/usage"))).await;
    assert_eq!(status, StatusCode::OK);
    let records = usage.as_array().expect("usage array");
    assert_eq!(records.len(), 1, "one usage record after one brew");
    assert_eq!(records[0]["gramsUsed"], 18.0);
    assert_eq!(records[0]["grinderUsed"], "Comandante C40");
    assert_eq!(records[0]["brewingMethod"], "Espresso");

    cleanup(&pool, &[bean_id], &[grinder_id]).await;
}

/// A brew whose dose exceeds the bean's remaining grams is mapped to the
/// `InsufficientQuantity` error: `409 Conflict` with a message naming both the
/// available and the required grams (never a silent clamp).
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn insufficient_quantity_maps_to_conflict_through_http() {
    let Some(pool) = pool().await else { return };
    let app = app(pool.clone());
    let origin = format!("Kenya-{}", Uuid::new_v4());

    let (_, grinder) = send(&app, post("/api/grinders", &grinder_body())).await;
    let grinder_id = id_of(&grinder);
    // Only 5 g in stock, less than an 18 g Espresso dose.
    let (_, bean) = send(&app, post("/api/beans", &bean_body(&origin, 5.0))).await;
    let bean_id = id_of(&bean);

    let session_body = json!({
        "beanId": bean_id,
        "grinderId": grinder_id,
        "brewingMethod": "Espresso",
        "grindSetting": 12,
        "waterTempCelsius": 93,
        "brewTimeSeconds": 30,
        "coffeeGrams": 18.0,
        "waterGrams": 36.0,
        "isTemplate": false
    });
    let (status, body) = send(&app, post("/api/sessions", &session_body)).await;
    assert_eq!(
        status,
        StatusCode::CONFLICT,
        "insufficient quantity maps to 409"
    );
    let error = body["error"].as_str().expect("error message");
    assert!(
        error.contains("5") && error.contains("18"),
        "message names available (5g) and required (18g): {error}"
    );
    // The detailed, machine-readable reasons name both quantities too.
    let details = body["details"].as_array().expect("details array");
    assert!(
        details.iter().any(|d| d.as_str().unwrap_or("").contains("available")),
        "details name the available grams"
    );
    assert!(
        details.iter().any(|d| d.as_str().unwrap_or("").contains("required")),
        "details name the required grams"
    );

    // The save rolled back: no session, grams unchanged.
    let (_, usage) = send(&app, get(&format!("/api/beans/{bean_id}/usage"))).await;
    assert_eq!(
        usage.as_array().expect("usage array").len(),
        0,
        "no session logged on insufficient quantity"
    );

    cleanup(&pool, &[bean_id], &[grinder_id]).await;
}

/// A bean create with a roast date in the future is rejected by the business
/// validation with `400 Bad Request` and a field-named message.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn future_roast_date_is_rejected_through_http() {
    let Some(pool) = pool().await else { return };
    let app = app(pool.clone());
    let origin = format!("Colombia-{}", Uuid::new_v4());

    let today = chrono::Utc::now().naive_utc().date();
    let mut body = bean_body(&origin, 100.0);
    body["roastDate"] = json!((today + chrono::Duration::days(3)).to_string());

    let (status, resp) = send(&app, post("/api/beans", &body)).await;
    assert_eq!(
        status,
        StatusCode::BAD_REQUEST,
        "future roast date maps to 400"
    );
    let message = resp["error"].as_str().expect("error message");
    assert!(
        message.to_lowercase().contains("roast date"),
        "message names the roast-date field: {message}"
    );

    // Nothing was persisted.
    let (status, list) = send(&app, get("/api/beans")).await;
    assert_eq!(status, StatusCode::OK);
    assert!(
        !list["items"]
            .as_array()
            .expect("items")
            .iter()
            .any(|b| b["origin"] == origin),
        "rejected bean is not persisted"
    );
}

/// The session list endpoint filters by origin / method and searches free text,
/// each scoped to this test's unique origin so the counts are deterministic.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn list_filter_and_search_sessions_through_http() {
    let Some(pool) = pool().await else { return };
    let app = app(pool.clone());
    let origin = format!("Guatemala-{}", Uuid::new_v4());

    let (_, grinder) = send(&app, post("/api/grinders", &grinder_body())).await;
    let grinder_id = id_of(&grinder);
    let (_, bean) = send(&app, post("/api/beans", &bean_body(&origin, 500.0))).await;
    let bean_id = id_of(&bean);

    // Two V60 brews, one carrying a distinctive tasting note for the search.
    let base = json!({
        "beanId": bean_id,
        "grinderId": grinder_id,
        "brewingMethod": "V60",
        "grindSetting": 20,
        "waterTempCelsius": 93,
        "brewTimeSeconds": 180,
        "coffeeGrams": 20.0,
        "waterGrams": 320.0,
        "isTemplate": false
    });
    let mut first = base.clone();
    first["rating"] = json!(9.0);
    first["tastingNotes"] = json!("JASMINE florals");
    let (status, logged) = send(&app, post("/api/sessions", &first)).await;
    assert_eq!(status, StatusCode::CREATED);
    let first_id = id_of(&logged);

    let mut second = base.clone();
    second["rating"] = json!(7.0);
    let (status, _) = send(&app, post("/api/sessions", &second)).await;
    assert_eq!(status, StatusCode::CREATED);

    // Filter by this bean's unique origin -> exactly the two sessions.
    let (status, page) = send(
        &app,
        get(&format!("/api/sessions?beanOrigin={origin}&brewingMethod=V60")),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "list sessions is 200");
    assert_eq!(page["total"], 2, "two V60 sessions for this origin");
    assert_eq!(
        page["items"].as_array().expect("items").len(),
        2,
        "both sessions returned"
    );

    // Case-insensitive search on the tasting note hits only the first brew.
    let (status, searched) = send(&app, get("/api/sessions?q=jasmine")).await;
    assert_eq!(status, StatusCode::OK, "search sessions is 200");
    assert!(
        searched["items"]
            .as_array()
            .expect("items")
            .iter()
            .any(|s| id_of(s) == first_id),
        "search matches the jasmine tasting note"
    );

    cleanup(&pool, &[bean_id], &[grinder_id]).await;
}

/// Duplicating a session through `POST /api/sessions/:id/duplicate` re-brews the
/// same recipe (201), decrements inventory again, and drops the original's
/// rating and notes.
#[tokio::test]
#[ignore = "requires a live Postgres (DATABASE_URL); no DB in this sandbox"]
async fn duplicate_session_through_http() {
    let Some(pool) = pool().await else { return };
    let app = app(pool.clone());
    let origin = format!("Panama-{}", Uuid::new_v4());

    let (_, grinder) = send(&app, post("/api/grinders", &grinder_body())).await;
    let grinder_id = id_of(&grinder);
    let (_, bean) = send(&app, post("/api/beans", &bean_body(&origin, 100.0))).await;
    let bean_id = id_of(&bean);

    let session_body = json!({
        "beanId": bean_id,
        "grinderId": grinder_id,
        "brewingMethod": "V60",
        "grindSetting": 20,
        "waterTempCelsius": 93,
        "brewTimeSeconds": 180,
        "coffeeGrams": 20.0,
        "waterGrams": 320.0,
        "tastingNotes": "bright and floral",
        "rating": 9.0,
        "isTemplate": false
    });
    let (status, original) = send(&app, post("/api/sessions", &session_body)).await;
    assert_eq!(status, StatusCode::CREATED);
    let original_id = id_of(&original);

    // Duplicate re-brews through the same validation + inventory path (201).
    let (status, dup) = send(
        &app,
        post(&format!("/api/sessions/{original_id}/duplicate"), &json!({})),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED, "duplicate is 201");
    assert_eq!(dup["coffeeGrams"], 20.0, "duplicate re-brews the same dose");
    assert!(dup["rating"].is_null(), "duplicate drops the rating");
    assert!(
        dup["tastingNotes"].is_null(),
        "duplicate drops the tasting notes"
    );

    // Two brews of 20 g each decremented the bean from 100 g to 60 g.
    let (_, active) = send(&app, get("/api/beans/active")).await;
    let our_bean = active
        .as_array()
        .expect("active array")
        .iter()
        .find(|b| id_of(b) == bean_id)
        .expect("bean still active");
    assert_eq!(
        our_bean["remainingGrams"], 60.0,
        "100 g - 20 g - 20 g = 60 g after the original and its duplicate"
    );

    cleanup(&pool, &[bean_id], &[grinder_id]).await;
}
