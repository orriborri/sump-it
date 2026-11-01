//! API module combining features from all three applications.
//! Provides REST endpoints for the coffee brewing backend.

mod beans;
mod grinders;
mod sessions;

use axum::{http::StatusCode, response::IntoResponse, Json, Router};
use sqlx::PgPool;

use crate::{models::ErrorResponse, services::WriteError};

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
        .with_state(state)
}

/// Maps a bean/grinder [`WriteError`] to its HTTP response. This is the single
/// mapping site for those writes (mirroring `sessions::save_error_response`):
///
/// - `InvalidFields` -> `400` `{"error": "Validation failed", "details": [..]}`
/// - `Rule` -> `400` `{"error": "<rule message>"}`
/// - `Database` -> `500` `{"error": "<context>: <error>"}`
fn write_error_response(err: WriteError, context: &str) -> axum::response::Response {
    match err {
        WriteError::InvalidFields(details) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::with_details(
                "Validation failed".to_string(),
                vec![details],
            )),
        )
            .into_response(),
        WriteError::Rule(e) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        )
            .into_response(),
        WriteError::Database(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("{context}: {e}"))),
        )
            .into_response(),
    }
}
