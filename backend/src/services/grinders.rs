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

use crate::models::{CreateGrinderRequest, Grinder};
use crate::pagination::Page;
use crate::validation::ValidationErrorType;

/// Why a grinder create or update failed.
#[derive(Debug)]
pub enum GrinderServiceError {
    /// A grinder business rule was violated before any row was written.
    Validation(ValidationErrorType),
    /// An underlying database operation failed.
    Database(anyhow::Error),
}

impl std::fmt::Display for GrinderServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Validation(error) => write!(f, "{error}"),
            Self::Database(error) => write!(f, "{error}"),
        }
    }
}

/// Why a grinder delete failed.
///
/// Ticket #165: brewing sessions are immutable historical records, so a grinder
/// that is still referenced by any session cannot be removed (the FK is
/// `ON DELETE RESTRICT`, migration 0004). The API layer maps each variant to an
/// HTTP status: `Referenced` -> `409 Conflict`, `Database` -> `500`.
#[derive(Debug)]
pub enum DeleteError {
    /// The grinder is still referenced by at least one brewing session, so the
    /// `ON DELETE RESTRICT` foreign key refused the delete. Removing it would
    /// destroy session history, which is not allowed.
    Referenced,
    /// Any other underlying database failure.
    Database(anyhow::Error),
}

/// Postgres SQLSTATE for a foreign-key violation (`ON DELETE RESTRICT` refusal).
const FK_VIOLATION: &str = "23503";

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
    /// Normalization is delegated to the shared [`crate::pagination::Page`]
    /// (ticket #167) so the `LIMIT`/`OFFSET` used for the query match the
    /// `page_size`/`has_more` the handler reports.
    pub async fn list_grinders(
        &self,
        page: Option<i32>,
        limit: Option<i32>,
    ) -> Result<(Vec<Grinder>, i64)> {
        let paging = Page::from_request(page, limit);
        let limit = paging.page_size();
        let offset = paging.offset();

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
    /// The service is the authoritative invariant seam (ticket #166): the
    /// brand/setting-range business rules are validated HERE before any row is
    /// written, so a non-HTTP caller cannot persist an invalid grinder. The
    /// handler's validation is supplemental fast feedback only.
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
    /// Like [`Self::create_grinder`], the same business rules are enforced at
    /// the service layer before any write (ticket #166).
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
    ///
    /// Ticket #165 policy: brewing sessions are immutable historical records.
    /// The `brewing_sessions.grinder_id` foreign key is `ON DELETE RESTRICT`
    /// (migration 0004), so the database REFUSES to delete a grinder that is
    /// still referenced by any session rather than cascade-deleting that
    /// history. Such a refusal arrives as a Postgres foreign-key violation
    /// (SQLSTATE 23503); it is translated here into
    /// [`DeleteError::Referenced`] so the API can answer `409 Conflict` instead
    /// of a 500, and no session is ever destroyed. An unreferenced grinder
    /// deletes normally and `Ok(true)` is returned; deleting a missing grinder
    /// returns `Ok(false)`.
    pub async fn delete_grinder(&self, id: Uuid) -> std::result::Result<bool, DeleteError> {
        let result = sqlx::query(r#"DELETE FROM grinders WHERE id = $1"#)
            .bind(id)
            .execute(self.pool)
            .await;

        match result {
            Ok(done) => Ok(done.rows_affected() > 0),
            Err(e) => {
                // A RESTRICT foreign key refusing the delete (the grinder is
                // still used by a session) is a clean, expected conflict, not a
                // 500. Every other DB error is surfaced as `Database`.
                if e.as_database_error()
                    .and_then(|db| db.code())
                    .as_deref()
                    == Some(FK_VIOLATION)
                {
                    Err(DeleteError::Referenced)
                } else {
                    Err(DeleteError::Database(
                        anyhow::Error::new(e).context("Failed to delete grinder"),
                    ))
                }
            }
        }
    }
}

#[cfg(test)]
mod error_tests {
    use super::*;

    #[test]
    fn service_errors_have_actionable_messages() {
        let validation = GrinderServiceError::Validation(ValidationErrorType::Validation(
            "Maximum setting must be greater than minimum setting".to_string(),
        ));
        assert!(validation.to_string().contains("greater than"));

        let database = GrinderServiceError::Database(anyhow::anyhow!("database unavailable"));
        assert_eq!(database.to_string(), "database unavailable");
    }
}
