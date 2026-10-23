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
    pagination::Page,
    services::grinders::{DeleteError, GrinderService},
    validation::{validate_grinder_setting_range, validation_errors_to_string},
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
            // Metadata is derived from the SAME normalized pagination the
            // service used for the query (ticket #167), so an out-of-range
            // limit (0, negative, >100) cannot report a page_size/has_more
            // that disagrees with what was fetched.
            let paging = Page::from_request(params.page, params.limit);
            Json(PaginatedResponse {
                items: grinders,
                total,
                page: paging.page(),
                page_size: paging.page_size(),
                has_more: paging.has_more(total),
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
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to create grinder: {}", e))),
        )
            .into_response(),
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
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to update grinder: {}", e))),
        )
            .into_response(),
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
        // Ticket #165: the grinder is still referenced by brewing sessions, so
        // the `ON DELETE RESTRICT` foreign key refused the delete to protect
        // that immutable history. Surface a clean 409 Conflict, not a 500.
        Err(DeleteError::Referenced) => (
            StatusCode::CONFLICT,
            Json(ErrorResponse::new(
                "Cannot delete a grinder that has brewing sessions; its history is preserved."
                    .to_string(),
            )),
        )
            .into_response(),
        Err(DeleteError::Database(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to delete grinder: {}", e))),
        )
            .into_response(),
    }
}

/// Run both the derive-based field validation and the domain setting-range
/// validation for a grinder request. Returns `Some(response)` with a
/// `400 Bad Request` body when invalid, or `None` when the request is valid.
///
/// Kept as a private helper so create and update share the exact same rules
/// (brand/model length, `min_setting >= 0`, `max_setting > min_setting`).
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

    if let Err(e) = validate_grinder_setting_range(payload.min_setting, payload.max_setting) {
        return Some(
            (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new(e.to_string())),
            )
                .into_response(),
        );
    }

    None
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
