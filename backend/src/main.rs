//! Main entry point for the consolidated coffee brewing backend
//! Combines best practices from BeanIt, sump-it, and rustyCoffy

// The domain models, validation helpers, and service methods are consolidated
// up front but only the beans slice is wired into the API so far. The grinder,
// session, and feedback slices are connected by later tickets (#142/#143 and
// the feedback ticket), so allow dead code until those handlers land rather
// than deleting functionality those tickets depend on.
#![allow(dead_code)]
// Enable `#[coverage(off)]` on the binary's bootstrap/wiring when the coverage
// harness sets the `coverage_nightly` cfg. No effect on ordinary builds.
#![cfg_attr(coverage_nightly, feature(coverage_attribute))]

// The database-independent core (validation + models) lives in the library
// crate so the coverage gate can enforce 100% line coverage over it with
// `cargo llvm-cov --lib`. The binary re-exports those modules under the same
// `crate::` paths the API and service layers already use.
use coffee_brewer_backend::{models, validation};

mod api;
mod services;
mod database;

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
async fn health_check() -> StatusCode {
    StatusCode::OK
}
