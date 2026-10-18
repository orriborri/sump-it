//! API module combining features from all three applications.
//! Provides REST endpoints for the coffee brewing backend.

mod beans;
mod grinders;
mod sessions;
mod feedback;

use axum::Router;
use sqlx::PgPool;

/// Application state shared across all routes.
///
/// This is the single shared state type for the whole crate. It is cheap to
/// clone because `PgPool` is internally reference counted.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}

/// Create the main API router with all routes.
pub fn router(pool: PgPool) -> Router {
    let state = AppState { pool };

    Router::new()
        .nest("/beans", beans::router())
        .nest("/grinders", grinders::router())
        .nest("/sessions", sessions::router())
        .nest("/feedback", feedback::router())
        .with_state(state)
}
