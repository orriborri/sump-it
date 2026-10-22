//! Grinder service: database access and persistence for grinder equipment.
//!
//! Follows the same runtime-sqlx pattern as `services/beans.rs` (connection via
//! `PgPool`, `sqlx::query_as`, `anyhow` results) so the crate builds without a
//! live database. The pure grinder business logic (validation, setting range
//! checks, full name) lives on `crate::models::Grinder` in the library crate
//! and is unit-tested there; this service only owns the SQL.

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use anyhow::{Result, Context};

use crate::models::{Grinder, CreateGrinderRequest};
use crate::pagination::Pagination;
use crate::validation::ValidationErrorType;

/// Why a grinder create/update failed. Mirrors
/// `services::sessions::SaveError` and `services::beans::BeanServiceError`: the
/// service interface is the authoritative invariant seam (ticket #166), so it
/// distinguishes a business-rule VALIDATION failure (mapped by the API to
/// `400 Bad Request`) from an underlying DATABASE failure (`500`).
#[derive(Debug)]
pub enum GrinderServiceError {
    /// A business rule was violated (empty brand, non-positive setting range).
    /// The API renders this as a `400` with the error's message.
    Validation(ValidationErrorType),
    /// Any underlying database failure.
    Database(anyhow::Error),
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
        // Clamp once via the shared pagination policy (ticket #167) so the
        // query and the handler's response metadata agree on the page size.
        let Pagination { limit, offset, .. } = Pagination::from_request(page, limit);

        let total: i64 =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM grinders WHERE is_active = true"#)
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
            WHERE is_active = true
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
    /// Ticket #166: business-rule validation runs HERE, at the service seam,
    /// before any DB access, so an invalid grinder can never be persisted no
    /// matter which caller invokes the service.
    pub async fn create_grinder(
        &self,
        request: CreateGrinderRequest,
    ) -> std::result::Result<Grinder, GrinderServiceError> {
        request
            .validate_comprehensive()
            .map_err(GrinderServiceError::Validation)?;

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
        .map_err(GrinderServiceError::Database)?;

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
            WHERE id = $1 AND is_active = true
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
    /// Ticket #166: the same service-seam validation as `create_grinder` runs
    /// first, before any DB access.
    pub async fn update_grinder(
        &self,
        id: Uuid,
        request: CreateGrinderRequest,
    ) -> std::result::Result<Option<Grinder>, GrinderServiceError> {
        request
            .validate_comprehensive()
            .map_err(GrinderServiceError::Validation)?;

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
            WHERE id = $1 AND is_active = true
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
        .map_err(GrinderServiceError::Database)?;

        Ok(grinder)
    }

    /// Retire a grinder (soft delete), mirroring `BeanService::delete_bean`.
    ///
    /// Issue #165: brewing sessions are immutable historical records, so a
    /// grinder is never physically removed (that would cascade-delete the
    /// sessions that reference it). Instead this flips `is_active` to false so
    /// the grinder disappears from `list_grinders`/`get_grinder` while every
    /// brewing session, session-history row and bean-usage-history row that
    /// used it still resolves (those JOINs intentionally do not filter on
    /// `is_active`). Returns `true` when an active grinder was retired, `false`
    /// when no active grinder with that id existed (already retired or absent),
    /// matching the hard-delete contract callers relied on.
    pub async fn delete_grinder(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE grinders
            SET is_active = false, updated_at = $2
            WHERE id = $1 AND is_active = true
            "#,
        )
        .bind(id)
        .bind(Utc::now())
        .execute(self.pool)
        .await
        .context("Failed to delete grinder")?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::GrinderType;
    use sqlx::postgres::PgPoolOptions;

    /// Builds a lazy pool that never actually connects. `create_grinder`/
    /// `update_grinder` validate BEFORE touching the pool (ticket #166), so
    /// these DB-free tests prove the service seam rejects invalid input
    /// without a live Postgres.
    fn lazy_pool() -> PgPool {
        PgPoolOptions::new()
            .connect_lazy("postgres://invalid:invalid@127.0.0.1:1/none")
            .expect("build lazy pool")
    }

    fn invalid_request() -> CreateGrinderRequest {
        // `max_setting <= min_setting` is a business-rule violation caught by
        // `validate_comprehensive` via `validate_grinder_setting_range`.
        CreateGrinderRequest {
            brand: "Comandante".to_string(),
            model: "C40".to_string(),
            grinder_type: GrinderType::Manual,
            min_setting: 40,
            max_setting: 10,
            scale_type: None,
            description: None,
        }
    }

    /// The service itself (not the HTTP handler) rejects an invalid grinder on
    /// create, returning a typed validation error before any DB access.
    #[tokio::test]
    async fn create_grinder_rejects_invalid_at_service_seam() {
        let pool = lazy_pool();
        let service = GrinderService::new(&pool);
        let err = service
            .create_grinder(invalid_request())
            .await
            .expect_err("invalid grinder must be rejected by the service");
        assert!(matches!(err, GrinderServiceError::Validation(_)));
    }

    /// Same guarantee on update: the service validates before the DB.
    #[tokio::test]
    async fn update_grinder_rejects_invalid_at_service_seam() {
        let pool = lazy_pool();
        let service = GrinderService::new(&pool);
        let err = service
            .update_grinder(Uuid::new_v4(), invalid_request())
            .await
            .expect_err("invalid grinder must be rejected by the service");
        assert!(matches!(err, GrinderServiceError::Validation(_)));
    }
}
