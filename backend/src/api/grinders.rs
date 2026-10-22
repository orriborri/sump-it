//! Grinders API endpoints.
//!
//! Full CRUD for grinder equipment: create, list, get, edit, delete. The pure
//! business validation (brand non-empty, `min_setting >= 0`, and
//! `max_setting > min_setting`) lives on `crate::models::Grinder` via
//! `validate_comprehensive` and is reused here so the rule is not duplicated.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json, Router,
    routing::get,
};
use uuid::Uuid;
use validator::Validate;

use crate::{
    api::AppState,
    models::{CreateGrinderRequest, ErrorResponse, PaginatedResponse},
    services::grinders::{GrinderService, GrinderServiceError},
    validation::validation_errors_to_string,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_grinders).post(create_grinder))
        .route("/:id", get(get_grinder).put(update_grinder).delete(delete_grinder))
}

/// List grinders with pagination.
async fn list_grinders(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> impl IntoResponse {
    let service = GrinderService::new(&state.pool);

    match service.list_grinders(params.page, params.limit).await {
        Ok((grinders, total)) => {
            let page = params.page.unwrap_or(1);
            let page_size = params.limit.unwrap_or(50);
            Json(PaginatedResponse {
                items: grinders,
                total,
                page,
                page_size,
                has_more: total > (page * page_size) as i64,
            })
            .into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to list grinders: {}", e))),
        )
            .into_response(),
    }
}

/// Create a new grinder.
async fn create_grinder(
    State(state): State<AppState>,
    Json(payload): Json<CreateGrinderRequest>,
) -> impl IntoResponse {
    if let Some(response) = validate_grinder_request(&payload) {
        return response;
    }

    let service = GrinderService::new(&state.pool);

    match service.create_grinder(payload).await {
        Ok(grinder) => (StatusCode::CREATED, Json(grinder)).into_response(),
        Err(e) => grinder_service_error_response(e, "Failed to create grinder"),
    }
}

/// Get a specific grinder by ID.
async fn get_grinder(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = GrinderService::new(&state.pool);

    match service.get_grinder(id).await {
        Ok(Some(grinder)) => Json(grinder).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Grinder not found".to_string())),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to get grinder: {}", e))),
        )
            .into_response(),
    }
}

/// Update (edit) an existing grinder.
async fn update_grinder(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateGrinderRequest>,
) -> impl IntoResponse {
    if let Some(response) = validate_grinder_request(&payload) {
        return response;
    }

    let service = GrinderService::new(&state.pool);

    match service.update_grinder(id, payload).await {
        Ok(Some(grinder)) => Json(grinder).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Grinder not found".to_string())),
        )
            .into_response(),
        Err(e) => grinder_service_error_response(e, "Failed to update grinder"),
    }
}

/// Delete (remove) a grinder.
async fn delete_grinder(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = GrinderService::new(&state.pool);

    match service.delete_grinder(id).await {
        Ok(true) => (StatusCode::NO_CONTENT, ()).into_response(),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Grinder not found".to_string())),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to delete grinder: {}", e))),
        )
            .into_response(),
    }
}

/// Run the cheap derive-based field validation (brand/model length) for a
/// grinder request as supplemental fast feedback. Returns `Some(response)` with
/// a `400 Bad Request` body when invalid, or `None` when the shape is valid.
///
/// The domain setting-range rule (`min_setting >= 0`, `max_setting > min_setting`)
/// is NOT re-encoded here: it is owned by the service layer
/// (`GrinderService::create_grinder`/`update_grinder` via
/// `CreateGrinderRequest::validate_comprehensive`), whose typed error the
/// handlers map to the same `400` response. Keeping it in one place means a
/// non-handler caller cannot bypass it.
fn validate_grinder_request(payload: &CreateGrinderRequest) -> Option<axum::response::Response> {
    if let Err(validation_errors) = payload.validate() {
        return Some(
            (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::with_details(
                    "Validation failed".to_string(),
                    vec![validation_errors_to_string(&validation_errors)],
                )),
            )
                .into_response(),
        );
    }

    None
}

/// Map a [`GrinderServiceError`] to an HTTP response with an [`ErrorResponse`]
/// body, mirroring `api::sessions::save_error_response`.
///
/// A service-layer validation failure is a client error: it maps to the SAME
/// `400 Bad Request` + `ErrorResponse` body the handler fast-path produces, so
/// behaviour is unchanged whichever layer catches the invalid input. Any
/// database failure stays a `500` with the existing `"{context}: {e}"` wording.
fn grinder_service_error_response(
    err: GrinderServiceError,
    context: &str,
) -> axum::response::Response {
    match err {
        GrinderServiceError::Validation(e) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        )
            .into_response(),
        GrinderServiceError::Database(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("{context}: {e}"))),
        )
            .into_response(),
    }
}

/// Query parameters for listing grinders.
///
/// Both fields are optional; the handler applies the 1/50 page/limit defaults
/// inline via `unwrap_or`, so there is no separate `Default` impl to keep in
/// sync (and none to leave untested).
#[derive(Debug, serde::Deserialize)]
struct ListParams {
    page: Option<i32>,
    limit: Option<i32>,
}
