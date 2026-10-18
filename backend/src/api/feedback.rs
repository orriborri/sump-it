//! Brew feedback API endpoints.
//!
//! Stub module: the router is wired up so the crate builds, but the handlers
//! are implemented in a later ticket. Returning an empty router keeps the
//! `/api/feedback` nesting valid.

use axum::Router;

use crate::api::AppState;

/// Create the feedback router. Intentionally empty for now.
pub fn router() -> Router<AppState> {
    Router::new()
}
