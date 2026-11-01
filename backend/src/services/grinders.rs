//! Grinder service: database access and persistence for grinder equipment.
//!
//! Follows the same runtime-sqlx pattern as `services/beans.rs` (connection via
//! `PgPool`, `sqlx::query_as`, `anyhow` results) so the crate builds without a
//! live database. The pure grinder rules (field lengths via `#[validate]`, the
//! setting range via `crate::validation::validate_grinder_setting_range`) are
//! defined and unit-tested in the library; `create_grinder`/`update_grinder`
//! enforce them BEFORE any SQL so the service owns the write invariants.

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use anyhow::{Result, Context};

use crate::models::{Grinder, CreateGrinderRequest};
use crate::services::{validate_write, WriteError};
use crate::validation::{validate_grinder_setting_range, ValidationErrorType};

/// The grinder write rule: the setting range must be valid
/// (`min_setting >= 0`, `max_setting > min_setting`).
fn grinder_rule(request: &CreateGrinderRequest) -> std::result::Result<(), ValidationErrorType> {
    validate_grinder_setting_range(request.min_setting, request.max_setting)
}

/// Service for managing grinders.
pub struct GrinderService<'a> {
    pool: &'a PgPool,
}

impl<'a> GrinderService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    /// List grinders with pagination, newest first.
    pub async fn list_grinders(
        &self,
        page: Option<i32>,
        limit: Option<i32>,
    ) -> Result<(Vec<Grinder>, i64)> {
        // Clamp through the single source of truth (`crate::pagination`) rather
        // than hand-written literals, so the policy (DEFAULT_LIMIT=50,
        // MAX_LIMIT=100) can never silently drift from the module the handler
        // uses to derive page_size/has_more. The handler already passes
        // normalized values, so this call is idempotent; keeping it means the
        // SQL window stays correct even if the service is called with raw values.
        let pagination = crate::pagination::Pagination::from_page(page, limit);
        let limit = pagination.limit;
        let offset = pagination.offset;

        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM grinders"#)
            .fetch_one(self.pool)
            .await
            .context("Failed to count grinders")?;

        let grinders = sqlx::query_as::<_, Grinder>(
            r#"
            SELECT
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description,
                created_at, updated_at
            FROM grinders
            ORDER BY created_at DESC, brand ASC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(self.pool)
        .await
        .context("Failed to fetch grinders")?;

        Ok((grinders, total))
    }

    /// Create a new grinder.
    ///
    /// Validates the request (field lengths, then the setting range) BEFORE
    /// any database access.
    pub async fn create_grinder(
        &self,
        request: CreateGrinderRequest,
    ) -> std::result::Result<Grinder, WriteError> {
        validate_write(&request, grinder_rule)?;
        let now = Utc::now();

        let grinder = sqlx::query_as::<_, Grinder>(
            r#"
            INSERT INTO grinders (
                id, brand, model, grinder_type, min_setting, max_setting,
                scale_type, description, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description,
                created_at, updated_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(request.brand)
        .bind(request.model)
        .bind(request.grinder_type)
        .bind(request.min_setting)
        .bind(request.max_setting)
        .bind(request.scale_type)
        .bind(request.description)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await
        .context("Failed to create grinder")
        .map_err(WriteError::Database)?;

        Ok(grinder)
    }

    /// Get a specific grinder by ID.
    pub async fn get_grinder(&self, id: Uuid) -> Result<Option<Grinder>> {
        let grinder = sqlx::query_as::<_, Grinder>(
            r#"
            SELECT
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description,
                created_at, updated_at
            FROM grinders
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await
        .context("Failed to fetch grinder")?;

        Ok(grinder)
    }


    /// Update an existing grinder.
    ///
    /// Applies the same validation as [`Self::create_grinder`] BEFORE any
    /// database access.
    pub async fn update_grinder(
        &self,
        id: Uuid,
        request: CreateGrinderRequest,
    ) -> std::result::Result<Option<Grinder>, WriteError> {
        validate_write(&request, grinder_rule)?;
        let now = Utc::now();

        let grinder = sqlx::query_as::<_, Grinder>(
            r#"
            UPDATE grinders
            SET
                brand = $2,
                model = $3,
                grinder_type = $4,
                min_setting = $5,
                max_setting = $6,
                scale_type = $7,
                description = $8,
                updated_at = $9
            WHERE id = $1
            RETURNING
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description,
                created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(request.brand)
        .bind(request.model)
        .bind(request.grinder_type)
        .bind(request.min_setting)
        .bind(request.max_setting)
        .bind(request.scale_type)
        .bind(request.description)
        .bind(now)
        .fetch_optional(self.pool)
        .await
        .context("Failed to update grinder")
        .map_err(WriteError::Database)?;

        Ok(grinder)
    }

    /// Delete a grinder (hard delete; grinders have no soft-delete column).
    pub async fn delete_grinder(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query(r#"DELETE FROM grinders WHERE id = $1"#)
            .bind(id)
            .execute(self.pool)
            .await
            .context("Failed to delete grinder")?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    //! Service-seam tests: invalid grinder data is rejected by
    //! `GrinderService` itself, without going through the HTTP router and
    //! BEFORE any database round trip (the pool points at an unreachable
    //! address and is never connected).
    use super::*;
    use crate::models::GrinderType;
    use crate::services::WriteError;
    use sqlx::postgres::PgPoolOptions;

    fn unreachable_pool() -> PgPool {
        PgPoolOptions::new()
            .connect_lazy("postgres://nobody@127.0.0.1:1/unreachable")
            .expect("lazy pool")
    }

    fn valid_request() -> CreateGrinderRequest {
        CreateGrinderRequest {
            brand: "Comandante".to_string(),
            model: "C40".to_string(),
            grinder_type: GrinderType::BurrConical,
            min_setting: 0,
            max_setting: 40,
            scale_type: None,
            description: None,
        }
    }

    #[tokio::test]
    async fn create_grinder_rejects_max_not_above_min_as_rule_violation() {
        let pool = unreachable_pool();
        let request = CreateGrinderRequest { min_setting: 40, max_setting: 40, ..valid_request() };

        let err = GrinderService::new(&pool).create_grinder(request).await.unwrap_err();

        assert!(
            matches!(
                &err,
                WriteError::Rule(ValidationErrorType::Validation(message))
                    if message == "Maximum setting (40) must be greater than minimum setting (40)"
            )
        );
    }

    #[tokio::test]
    async fn create_grinder_rejects_empty_brand_as_invalid_fields() {
        let pool = unreachable_pool();
        let request = CreateGrinderRequest { brand: String::new(), ..valid_request() };

        let err = GrinderService::new(&pool).create_grinder(request).await.unwrap_err();

        assert!(matches!(err, WriteError::InvalidFields(ref details) if details.contains("brand")));
    }

    #[tokio::test]
    async fn update_grinder_rejects_negative_min_setting_as_rule_violation() {
        let pool = unreachable_pool();
        let request = CreateGrinderRequest { min_setting: -1, ..valid_request() };

        let err = GrinderService::new(&pool)
            .update_grinder(Uuid::new_v4(), request)
            .await
            .unwrap_err();

        assert!(
            matches!(
                &err,
                WriteError::Rule(ValidationErrorType::Validation(message))
                    if message == "Minimum setting must be non-negative"
            )
        );
    }

    #[tokio::test]
    async fn update_grinder_rejects_overlong_model_as_invalid_fields() {
        let pool = unreachable_pool();
        let request = CreateGrinderRequest { model: "x".repeat(101), ..valid_request() };

        let err = GrinderService::new(&pool)
            .update_grinder(Uuid::new_v4(), request)
            .await
            .unwrap_err();

        assert!(matches!(err, WriteError::InvalidFields(ref details) if details.contains("model")));
    }
}
