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
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use uuid::Uuid;
use validator::Validate;

use crate::{
    api::AppState,
    models::{
        BrewingMethod, CreateBrewingSessionRequest, ErrorResponse, GrinderType, PaginatedResponse,
        SessionFilter,
    },
    pagination::Pagination,
    services::sessions::{SaveError, SessionService},
    validation::validation_errors_to_string,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_sessions).post(create_session))
        .route("/:id/duplicate", post(duplicate_session))
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
        SaveError::SessionNotFound => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new(
                "Brewing session not found".to_string(),
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

/// List brewing sessions newest-first with paging, filters and text search
/// (ticket #146).
///
/// All filter columns (bean origin, roast-date range, grinder type, brewing
/// method, minimum rating) and the optional `q` search term are forwarded to
/// `SessionService::list_filtered`, which builds a safely-parameterised query
/// via the pure `session_query` helpers. The response carries the TOTAL match
/// count so the client can page correctly.
async fn list_sessions(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> impl IntoResponse {
    let service = SessionService::new(&state.pool);

    let filter = params.to_filter();
    match service.list_filtered(&filter, params.q.as_deref()).await {
        Ok((sessions, total)) => {
            // Derive response metadata from the SAME normalized window the
            // filter was built from, so page/page_size/has_more cannot diverge
            // from what was fetched.
            let pagination = Pagination::from_offset(filter.limit, filter.offset, None);
            Json(PaginatedResponse {
                items: sessions,
                total,
                page: pagination.page(),
                page_size: pagination.page_size(),
                has_more: pagination.has_more(total),
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

/// Duplicate an existing session (ticket #146): re-brews its parameters through
/// the same validation + inventory path as a new brew, dropping rating/notes.
async fn duplicate_session(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = SessionService::new(&state.pool);

    match service.duplicate(id).await {
        Ok(session) => (StatusCode::CREATED, Json(session)).into_response(),
        Err(err) => save_error_response(err),
    }
}

/// Query parameters for listing sessions: paging, filters and search.
///
/// `limit`/`offset` map straight onto [`SessionFilter`] (and are clamped by the
/// pure `session_query` helpers). `page` is accepted for compatibility with the
/// other list endpoints and, when provided without an explicit `offset`, is
/// converted to an offset.
#[derive(Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListParams {
    page: Option<i32>,
    limit: Option<i32>,
    offset: Option<i32>,
    bean_origin: Option<String>,
    roast_date_from: Option<chrono::NaiveDate>,
    roast_date_to: Option<chrono::NaiveDate>,
    grinder_type: Option<GrinderType>,
    brewing_method: Option<BrewingMethod>,
    rating_min: Option<f32>,
    /// Free-text search term (`q`), matched case-insensitively across bean
    /// name, bean origin, grinder brand and tasting notes.
    q: Option<String>,
}

impl ListParams {
    /// Builds the [`SessionFilter`] these params describe. A 1-based `page`
    /// (when given and no explicit `offset`) becomes an offset of
    /// `(page - 1) * limit`.
    fn to_filter(&self) -> SessionFilter {
        // Normalize once through the shared pagination value object so the
        // filter's limit/offset match the response metadata exactly. `offset`
        // wins over `page` when both are given (offset-based paging).
        let pagination = Pagination::from_offset(self.limit, self.offset, self.page);
        SessionFilter {
            bean_origin: self.bean_origin.clone(),
            roast_date_from: self.roast_date_from,
            roast_date_to: self.roast_date_to,
            grinder_type: self.grinder_type.clone(),
            brewing_method: self.brewing_method.clone(),
            rating_min: self.rating_min,
            limit: Some(pagination.limit),
            offset: Some(pagination.offset),
        }
    }
}
