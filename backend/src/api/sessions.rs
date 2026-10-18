//! Brewing sessions API endpoints.
//!
//! Stub module: the router is wired up so the crate builds, but the handlers
//! are implemented in a later ticket. Returning an empty router keeps the
//! `/api/sessions` nesting valid.

use axum::Router;

use crate::api::AppState;

/// Create the sessions router. Intentionally empty for now.
pub fn router() -> Router<AppState> {
    Router::new()
}
