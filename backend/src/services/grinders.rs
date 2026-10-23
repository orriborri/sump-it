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

/// Service for managing grinders.
pub struct GrinderService<'a> {
    pool: &'a PgPool,
}

impl<'a> GrinderService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    /// List grinders with pagination, newest first.
    ///
    /// Normalization goes through the shared [`Pagination`] value object
    /// (ticket #167): the same clamped `page_size`/`offset` drive BOTH the SQL
    /// below and the handler's response metadata. Inactive (retired) grinders
    /// are excluded, mirroring the bean soft-delete policy (ticket #165).
    pub async fn list_grinders(
        &self,
        page: Option<i32>,
        limit: Option<i32>,
    ) -> Result<(Vec<Grinder>, i64, Pagination)> {
        let pagination = Pagination::from_request(page, limit);
        let limit = pagination.limit();
        let offset = pagination.offset;

        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM grinders WHERE is_active = true"#)
            .fetch_one(self.pool)
            .await
            .context("Failed to count grinders")?;

        let grinders = sqlx::query_as::<_, Grinder>(
            r#"
            SELECT
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description, is_active,
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

        Ok((grinders, total, pagination))
    }

    /// Create a new grinder.
    ///
    /// Business-rule validation runs HERE at the service seam (ticket #166):
    /// the request is checked with `validate_comprehensive` (non-empty brand,
    /// `min_setting >= 0`, `max_setting > min_setting`) before any SQL, so a
    /// create through the service rejects invalid data regardless of the HTTP
    /// handler. Handler-level validation remains only as supplemental fast
    /// feedback.
    pub async fn create_grinder(&self, request: CreateGrinderRequest) -> Result<Grinder> {
        request
            .validate_comprehensive()
            .map_err(|e| anyhow::anyhow!(e.to_string()))?;

        let now = Utc::now();

        let grinder = sqlx::query_as::<_, Grinder>(
            r#"
            INSERT INTO grinders (
                id, brand, model, grinder_type, min_setting, max_setting,
                scale_type, description, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
            RETURNING
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description, is_active,
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
        .context("Failed to create grinder")?;

        Ok(grinder)
    }

    /// Get a specific grinder by ID.
    pub async fn get_grinder(&self, id: Uuid) -> Result<Option<Grinder>> {
        let grinder = sqlx::query_as::<_, Grinder>(
            r#"
            SELECT
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description, is_active,
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
    /// Validates the request at the service seam (ticket #166) before the SQL,
    /// identically to [`Self::create_grinder`].
    pub async fn update_grinder(
        &self,
        id: Uuid,
        request: CreateGrinderRequest,
    ) -> Result<Option<Grinder>> {
        request
            .validate_comprehensive()
            .map_err(|e| anyhow::anyhow!(e.to_string()))?;

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
                min_setting, max_setting, scale_type, description, is_active,
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
        .context("Failed to update grinder")?;

        Ok(grinder)
    }

    /// Retire a grinder (soft delete; ticket #165).
    ///
    /// Grinders are retired by setting `is_active = false` rather than being
    /// removed, exactly like beans (`services/beans.rs::delete_bean`). This
    /// treats brewing sessions as immutable history: a grinder that has logged
    /// brews keeps its row so those sessions (and the bean-usage history that
    /// joins them) survive, while list/get stop surfacing the retired grinder.
    /// Returns `true` when an active grinder was retired, `false` when there
    /// was no active grinder with that id (already retired or never existed).
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

    /// A lazily-connected pool to a URL that is NEVER contacted: the
    /// service-layer validation (ticket #166) rejects an invalid request
    /// BEFORE any SQL runs, so these tests prove the service is the
    /// authoritative seam without needing a live database. `connect_lazy`
    /// defers connecting until the first query, which never happens on the
    /// validation-failure path.
    fn lazy_pool() -> PgPool {
        PgPool::connect_lazy("postgres://invalid:invalid@127.0.0.1:1/nonexistent")
            .expect("lazy pool construction never connects")
    }

    fn request(brand: &str, min: i32, max: i32) -> CreateGrinderRequest {
        CreateGrinderRequest {
            brand: brand.to_string(),
            model: "C40".to_string(),
            grinder_type: GrinderType::BurrConical,
            min_setting: min,
            max_setting: max,
            scale_type: Some("step".to_string()),
            description: None,
        }
    }

    #[tokio::test]
    async fn create_grinder_rejects_empty_brand_at_service_layer() {
        let pool = lazy_pool();
        let service = GrinderService::new(&pool);
        let err = service
            .create_grinder(request("   ", 0, 40))
            .await
            .expect_err("empty brand must be rejected by the service");
        assert!(err.to_string().to_lowercase().contains("brand"));
    }

    #[tokio::test]
    async fn create_grinder_rejects_inverted_range_at_service_layer() {
        let pool = lazy_pool();
        let service = GrinderService::new(&pool);
        let err = service
            .create_grinder(request("Comandante", 40, 40))
            .await
            .expect_err("max_setting <= min_setting must be rejected by the service");
        assert!(err.to_string().to_lowercase().contains("maximum"));
    }

    #[tokio::test]
    async fn create_grinder_rejects_negative_min_at_service_layer() {
        let pool = lazy_pool();
        let service = GrinderService::new(&pool);
        let err = service
            .create_grinder(request("Comandante", -1, 40))
            .await
            .expect_err("negative min_setting must be rejected by the service");
        assert!(err.to_string().to_lowercase().contains("non-negative"));
    }

    #[tokio::test]
    async fn update_grinder_rejects_invalid_data_at_service_layer() {
        let pool = lazy_pool();
        let service = GrinderService::new(&pool);
        // Update must enforce the same invariants as create, independent of
        // the HTTP handler.
        let err = service
            .update_grinder(Uuid::new_v4(), request("", 0, 40))
            .await
            .expect_err("empty brand must be rejected by the service on update");
        assert!(err.to_string().to_lowercase().contains("brand"));
    }
}
