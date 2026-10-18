//! API module combining features from all three applications
//! Provides REST endpoints that can be consumed by tRPC client

mod beans;
mod grinders;
mod sessions;
mod feedback;

use axum::Router;
use sqlx::PgPool;
use std::sync::Arc;

/// Application state shared across all routes
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}

/// Create the main API router with all routes
pub fn router(pool: PgPool) -> Router {
    let state = Arc::new(AppState { pool });
    
    Router::new()
        .nest("/beans", beans::router())
        .nest("/grinders", grinders::router())
        .nest("/sessions", sessions::router())
        .nest("/feedback", feedback::router())
        .with_state(state)
}