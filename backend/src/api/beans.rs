//! Beans API endpoints
//! Combines features from BeanIt and rustyCoffy

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
    models::{CreateCoffeeBeanRequest, PaginatedResponse, ErrorResponse},
    pagination::Pagination,
    services::beans::{BeanService, BeanServiceError},
    validation::validation_errors_to_string,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_beans).post(create_bean))
        // The collection-level `/active` route must be registered before the
        // `/:id` capture so it is not swallowed as an id segment.
        .route("/active", get(get_active_beans))
        .route("/:id", get(get_bean).put(update_bean).delete(delete_bean))
        .route("/:id/usage", get(get_bean_usage))
}

/// List all coffee beans with pagination
async fn list_beans(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> impl IntoResponse {
    let service = BeanService::new(&state.pool);
    
    // Normalize once (ticket #167) so page_size/has_more in the response are
    // derived from the SAME clamped values the service paged with, not the raw
    // request params.
    let pagination = Pagination::from_request(params.page, params.limit);

    match service.list_beans(params.page, params.limit).await {
        Ok((beans, total)) => Json(PaginatedResponse {
            items: beans,
            total,
            page: pagination.page,
            page_size: pagination.limit,
            has_more: pagination.has_more(total),
        }).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to list beans: {}", e))),
        ).into_response(),
    }
}

/// Create a new coffee bean
async fn create_bean(
    State(state): State<AppState>,
    Json(payload): Json<CreateCoffeeBeanRequest>,
) -> impl IntoResponse {
    // Validate input
    if let Err(validation_errors) = payload.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::with_details(
                "Validation failed".to_string(),
                vec![validation_errors_to_string(&validation_errors)],
            )),
        ).into_response();
    }
    
    // Business-rule validation: non-empty name/origin, no future roast or
    // purchase dates, and non-negative remaining grams. Each error names the
    // offending field clearly.
    if let Err(e) = payload.validate_comprehensive() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        ).into_response();
    }
    
    let service = BeanService::new(&state.pool);
    
    match service.create_bean(payload).await {
        Ok(bean) => (StatusCode::CREATED, Json(bean)).into_response(),
        // The service seam (ticket #166) is authoritative: a validation
        // failure there maps to the SAME 400 body the handler produces above,
        // a DB failure to the SAME 500 body as before.
        Err(BeanServiceError::Validation(e)) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        ).into_response(),
        Err(BeanServiceError::Database(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to create bean: {}", e))),
        ).into_response(),
    }
}

/// Get a specific coffee bean by ID
async fn get_bean(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = BeanService::new(&state.pool);
    
    match service.get_bean(id).await {
        Ok(Some(bean)) => Json(bean).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Coffee bean not found".to_string())),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to get bean: {}", e))),
        ).into_response(),
    }
}

/// Update a coffee bean
async fn update_bean(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateCoffeeBeanRequest>,
) -> impl IntoResponse {
    // Validate input
    if let Err(validation_errors) = payload.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::with_details(
                "Validation failed".to_string(),
                vec![validation_errors_to_string(&validation_errors)],
            )),
        ).into_response();
    }

    // Business-rule validation (same rules as create): clear, named errors.
    if let Err(e) = payload.validate_comprehensive() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        ).into_response();
    }
    
    let service = BeanService::new(&state.pool);
    
    match service.update_bean(id, payload).await {
        Ok(Some(bean)) => Json(bean).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Coffee bean not found".to_string())),
        ).into_response(),
        Err(BeanServiceError::Validation(e)) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(e.to_string())),
        ).into_response(),
        Err(BeanServiceError::Database(e)) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to update bean: {}", e))),
        ).into_response(),
    }
}

/// Delete a coffee bean
async fn delete_bean(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = BeanService::new(&state.pool);
    
    match service.delete_bean(id).await {
        Ok(true) => (StatusCode::NO_CONTENT, ()).into_response(),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Coffee bean not found".to_string())),
        ).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to delete bean: {}", e))),
        ).into_response(),
    }
}

/// Get only active beans (with remaining quantity > 0)
async fn get_active_beans(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let service = BeanService::new(&state.pool);
    
    match service.get_active_beans().await {
        Ok(beans) => Json(beans).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to get active beans: {}", e))),
        ).into_response(),
    }
}

/// Get usage history for a bean
async fn get_bean_usage(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = BeanService::new(&state.pool);
    
    match service.get_bean_usage_history(id).await {
        Ok(history) => Json(history).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new(format!("Failed to get bean usage: {}", e))),
        ).into_response(),
    }
}

/// Query parameters for listing beans.
///
/// Both fields are optional; the handlers apply the 1/50 page/limit defaults
/// inline via `unwrap_or`, so there is no separate `Default` impl to keep in
/// sync (and none to leave untested).
#[derive(Debug, serde::Deserialize)]
struct ListParams {
    page: Option<i32>,
    limit: Option<i32>,
}

