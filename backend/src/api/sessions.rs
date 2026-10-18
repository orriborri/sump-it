//! Brewing sessions API endpoints (ticket #145).
//!
//! The create endpoint logs a brew ATOMICALLY: it routes the request through
//! the per-method recipe rules (`recipe::validate`), then inserts the session
//! and decrements the bean inventory inside a single transaction
//! (`SessionService::log_brew`). Validation failures map to `400 Bad Request`;
//! an insufficient-quantity failure maps to `409 Conflict` with the available
//! and required grams in the message (never a silent clamp); a missing bean or
//! grinder maps to `404 Not Found`.
//!
//! The list endpoint feeds the stepper's "recent brews" panel. Beans and
//! grinders have their own routers (tickets #142/#143) and are not duplicated
//! here.

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use validator::Validate;

use crate::{
    api::AppState,
    models::{CreateBrewingSessionRequest, ErrorResponse, PaginatedResponse},
    services::sessions::{SaveError, SessionService},
    validation::validation_errors_to_string,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_sessions).post(create_session))
}

/// Create (log) a brewing session atomically.
async fn create_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateBrewingSessionRequest>,
) -> impl IntoResponse {
    // Cheap request-shape validation first (only the method-invariant
    // `grind_setting >= 0` survives at this layer). Per-method amount/ratio/
    // temperature/time rules are enforced inside `log_brew` via the recipe.
    if let Err(validation_errors) = payload.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::with_details(
                "Validation failed".to_string(),
                vec![validation_errors_to_string(&validation_errors)],
            )),
        )
            .into_response();
    }

    let service = SessionService::new(&state.pool);

    match service.log_brew(payload).await {
        Ok(session) => (StatusCode::CREATED, Json(session)).into_response(),
        Err(err) => save_error_response(err),
    }
}

/// Map a [`SaveError`] to an HTTP response with an [`ErrorResponse`] body.
///
/// Kept as a pure mapping so the status/body for every failure mode is obvious:
/// recipe violations are `400`; insufficient inventory is `409` and names the
/// available and required grams; a missing bean/grinder is `404`; anything else
/// is a `500`.
fn save_error_response(err: SaveError) -> axum::response::Response {
    match err {
        SaveError::Recipe(e) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        )
            .into_response(),
        SaveError::InsufficientQuantity {
            available,
            required,
        } => (
            StatusCode::CONFLICT,
            Json(ErrorResponse::with_details(
                format!(
                    "Insufficient bean quantity: {available}g available, {required}g required"
                ),
                vec![
                    format!("available: {available}g"),
                    format!("required: {required}g"),
                ],
            )),
        )
            .into_response(),
        SaveError::BeanNotFound => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new(
                "Coffee bean not found or inactive".to_string(),
            )),
        )
            .into_response(),
        SaveError::GrinderNotFound => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Grinder not found".to_string())),
        )
            .into_response(),
        SaveError::Database(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!(
                "Failed to save brewing session: {e}"
            ))),
        )
            .into_response(),
    }
}

/// List recent brewing sessions (newest first) for the stepper.
async fn list_sessions(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> impl IntoResponse {
    let service = SessionService::new(&state.pool);

    match service.list_recent(params.limit).await {
        Ok((sessions, total)) => {
            let page = params.page.unwrap_or(1);
            let page_size = params.limit.unwrap_or(5);
            Json(PaginatedResponse {
                items: sessions,
                total,
                page,
                page_size,
                has_more: total > (page * page_size) as i64,
            })
            .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to list sessions: {e}"))),
        )
            .into_response(),
    }
}

/// Query parameters for listing sessions.
#[derive(Debug, serde::Deserialize)]
struct ListParams {
    page: Option<i32>,
    limit: Option<i32>,
}

impl Default for ListParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(5),
        }
    }
}
