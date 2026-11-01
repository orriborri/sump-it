//! Grinders API endpoints.
//!
//! Full CRUD for grinder equipment: create, list, get, edit, delete. Write
//! validation (brand/model length, `min_setting >= 0`, and
//! `max_setting > min_setting`) is owned by `GrinderService`; the handlers
//! only map its `WriteError` to HTTP via `api::write_error_response`.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json, Router,
    routing::get,
};
use uuid::Uuid;

use crate::{
    api::{write_error_response, AppState},
    models::{CreateGrinderRequest, ErrorResponse, PaginatedResponse},
    pagination::Pagination,
    services::grinders::GrinderService,
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

    // Normalize paging ONCE and derive both the query inputs and the response
    // metadata from it, so page_size/has_more always match what was fetched
    // (even for limit=0, negative, or >100).
    let pagination = Pagination::from_page(params.page, params.limit);
    match service
        .list_grinders(Some(pagination.page), Some(pagination.limit))
        .await
    {
        Ok((grinders, total)) => Json(PaginatedResponse {
            items: grinders,
            total,
            page: pagination.page(),
            page_size: pagination.page_size(),
            has_more: pagination.has_more(total),
        })
        .into_response(),
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
    let service = GrinderService::new(&state.pool);

    match service.create_grinder(payload).await {
        Ok(grinder) => (StatusCode::CREATED, Json(grinder)).into_response(),
        Err(e) => write_error_response(e, "Failed to create grinder"),
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
    let service = GrinderService::new(&state.pool);

    match service.update_grinder(id, payload).await {
        Ok(Some(grinder)) => Json(grinder).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Grinder not found".to_string())),
        )
            .into_response(),
        Err(e) => write_error_response(e, "Failed to update grinder"),
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

/// Query parameters for listing grinders.
///
/// Both fields are optional; the handler normalizes them once through
/// [`crate::pagination::Pagination::from_page`], which applies the
/// `DEFAULT_LIMIT`/clamp policy, so there is no separate defaulting logic to
/// keep in sync.
#[derive(Debug, serde::Deserialize)]
struct ListParams {
    page: Option<i32>,
    limit: Option<i32>,
}
