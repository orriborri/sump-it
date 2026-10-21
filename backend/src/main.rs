//! Main entry point for the consolidated coffee brewing backend
//! Combines best practices from BeanIt, sump-it, and rustyCoffy

// Enable `#[coverage(off)]` on the binary's bootstrap/wiring when the coverage
// harness sets the `coverage_nightly` cfg. No effect on ordinary builds.
#![cfg_attr(coverage_nightly, feature(coverage_attribute))]

// Everything worth testing - the DB-free core (validation, models, recipe,
// session_query) AND the DB-backed service layer and axum handlers - lives in
// the library crate so one `cargo llvm-cov` run gates it all at 100%. The
// binary only wires the process together (tracing, env, pool, router, listener).
use coffee_brewer_backend::{api, database};

use std::net::SocketAddr;
use axum::{Router, routing::get, http::StatusCode};
use tower_http::cors::CorsLayer;

// coverage: process bootstrap - wires tracing, env loading, the database pool,
// the router, and the TCP listener; exercised by running the server, not unit
// tests. Excluded per docs/coverage.md (process bootstrap/wiring).
#[cfg_attr(coverage_nightly, coverage(off))]
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize database connection pool
    let pool = database::init_pool().await?;

    // Create API router with all routes. The nested API router is already fully
    // stated, so the top-level router has no outstanding state requirement.
    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api", api::router(pool))
        .layer(CorsLayer::permissive()); // TODO: Configure CORS properly

    // Start server using the axum 0.7 serve API.
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

/// Health check endpoint. Returns 200 OK.
// coverage: process bootstrap - trivial liveness probe wired only into the
// server router in `main`; exercised by running the server, not unit tests.
#[cfg_attr(coverage_nightly, coverage(off))]
async fn health_check() -> StatusCode {
    StatusCode::OK
}
