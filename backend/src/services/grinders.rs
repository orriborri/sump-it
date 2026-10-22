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
use crate::validation::ValidationErrorType;

/// Why a grinder create/update failed. Mirrors `services::sessions::SaveError`:
/// the API layer maps each variant to an HTTP status and an `ErrorResponse`,
/// so `Validation` carries the precise `ValidationErrorType`.
#[derive(Debug)]
pub enum GrinderServiceError {
    /// A grinder business rule (empty brand, negative `min_setting`, or
    /// `max_setting <= min_setting`) was violated BEFORE any row was written.
    Validation(ValidationErrorType),
    /// Any underlying database failure.
    Database(anyhow::Error),
}

impl std::fmt::Display for GrinderServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GrinderServiceError::Validation(e) => write!(f, "{e}"),
            GrinderServiceError::Database(e) => write!(f, "{e}"),
        }
    }
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
        let page = page.unwrap_or(1).max(1);
        let limit = limit.unwrap_or(50).clamp(1, 100);
        let offset = (page - 1) * limit;

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
    /// Business-rule validation runs at the TOP of the method, BEFORE any pool
    /// or SQL access, so a non-handler caller cannot persist invalid data. The
    /// handler keeps its own fast-path check for immediate HTTP feedback, but
    /// this service is the authoritative owner of the invariants.
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
    /// Like [`Self::create_grinder`], the business rules are validated at the
    /// top of the method, BEFORE any pool/SQL access, so invalid data fails at
    /// the service layer independent of the HTTP handler.
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
        .map_err(GrinderServiceError::Database)?;

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
