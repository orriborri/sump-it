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
        let page = page.unwrap_or(1).max(1);
        let limit = limit.unwrap_or(50).clamp(1, 100);
        let offset = (page - 1) * limit;

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
    pub async fn create_grinder(&self, request: CreateGrinderRequest) -> Result<Grinder> {
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
        .context("Failed to create grinder")?;

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
    pub async fn update_grinder(
        &self,
        id: Uuid,
        request: CreateGrinderRequest,
    ) -> Result<Option<Grinder>> {
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
        .context("Failed to update grinder")?;

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
