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
use validator::Validate;

use crate::models::{Grinder, CreateGrinderRequest};
use crate::pagination::Page;
use crate::validation::{
    validate_grinder_setting_range, validation_errors_to_string, ValidationErrorType,
};

/// Why a grinder create/update was rejected at the SERVICE layer.
///
/// Mirrors [`crate::services::beans::BeanServiceError`] and the
/// `recipe::validate`/`SaveError` seam (ticket #166): the service command
/// interface owns grinder invariants (brand/model length, `min_setting >= 0`,
/// `max_setting > min_setting`), so a non-HTTP caller cannot persist an invalid
/// grinder. The API handler still validates first for fast feedback, leaving
/// the HTTP responses unchanged.
#[derive(Debug)]
pub enum GrinderServiceError {
    /// The request failed a field or setting-range invariant before any SQL ran.
    Validation(ValidationErrorType),
    /// An underlying database failure.
    Database(anyhow::Error),
}

impl std::fmt::Display for GrinderServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GrinderServiceError::Validation(e) => write!(f, "{}", e),
            GrinderServiceError::Database(e) => write!(f, "{}", e),
        }
    }
}

/// Validates an incoming grinder request against BOTH the derive-based field
/// rules (brand/model length) and the setting-range invariant
/// (`min_setting >= 0`, `max_setting > min_setting`). Shared by create and
/// update so the service owns the invariant regardless of the caller.
fn validate_grinder_request(request: &CreateGrinderRequest) -> Result<(), GrinderServiceError> {
    if let Err(errors) = request.validate() {
        return Err(GrinderServiceError::Validation(ValidationErrorType::Validation(
            validation_errors_to_string(&errors),
        )));
    }
    validate_grinder_setting_range(request.min_setting, request.max_setting)
        .map_err(GrinderServiceError::Validation)
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
    ///
    /// Pagination is normalized once by [`Page`] (ticket #167); the `LIMIT` and
    /// `OFFSET` executed here are the SAME normalized values the handler reports
    /// as `page_size`/`has_more`.
    pub async fn list_grinders(&self, page: Page) -> Result<(Vec<Grinder>, i64)> {
        let limit = page.limit();
        let offset = page.offset();

        let total: i64 =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM grinders WHERE is_active = true"#)
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

        Ok((grinders, total))
    }

    /// Create a new grinder.
    ///
    /// The service is the authoritative seam for grinder invariants (ticket
    /// #166): the request is validated HERE before any SQL runs, so a non-HTTP
    /// caller cannot persist an invalid grinder. Returns
    /// [`GrinderServiceError::Validation`] on a bad request and
    /// [`GrinderServiceError::Database`] on a SQL failure.
    pub async fn create_grinder(
        &self,
        request: CreateGrinderRequest,
    ) -> Result<Grinder, GrinderServiceError> {
        validate_grinder_request(&request)?;
        let now = Utc::now();

        let grinder = sqlx::query_as::<_, Grinder>(
            r#"
            INSERT INTO grinders (
                id, brand, model, grinder_type, min_setting, max_setting,
                scale_type, description, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        .bind(true) // is_active
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await
        .map_err(|e| GrinderServiceError::Database(
            anyhow::Error::new(e).context("Failed to create grinder"),
        ))?;

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
    /// Like [`Self::create_grinder`], the request is validated at the service
    /// layer (ticket #166) before any SQL runs. Returns `Ok(None)` when no
    /// grinder with `id` exists.
    pub async fn update_grinder(
        &self,
        id: Uuid,
        request: CreateGrinderRequest,
    ) -> Result<Option<Grinder>, GrinderServiceError> {
        validate_grinder_request(&request)?;
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
        .map_err(|e| GrinderServiceError::Database(
            anyhow::Error::new(e).context("Failed to update grinder"),
        ))?;

        Ok(grinder)
    }

    /// Retire a grinder (soft delete).
    ///
    /// Brewing sessions are immutable history, so removing a grinder must NEVER
    /// delete the sessions that referenced it (ticket #165). Instead of a hard
    /// `DELETE` (which, under the old `ON DELETE CASCADE`, destroyed those
    /// sessions), this flips `is_active = false` exactly like
    /// [`crate::services::beans::BeanService::delete_bean`]. The grinder then
    /// disappears from `list`/`get` while its row and every referencing session
    /// survive. Migration 0004 also hardens the FK to `ON DELETE RESTRICT` as a
    /// database backstop against any hard delete. Returns `true` when an active
    /// grinder was retired.
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
        .context("Failed to retire grinder")?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    //! Service-layer invariant tests (ticket #166).
    //!
    //! These assert the SERVICE command interface rejects invalid grinders
    //! independent of the HTTP handler. `create_grinder`/`update_grinder`
    //! validate via `validate_grinder_request` BEFORE opening any connection,
    //! so exercising that gate proves a non-HTTP caller cannot reach the SQL
    //! with an invalid request. The expected verdicts come from the documented
    //! grinder rules (non-empty brand/model within length bounds,
    //! `min_setting >= 0`, `max_setting > min_setting`).

    use super::*;
    use crate::models::GrinderType;

    /// A request that satisfies every documented grinder rule.
    fn valid_request() -> CreateGrinderRequest {
        CreateGrinderRequest {
            brand: "Comandante".to_string(),
            model: "C40".to_string(),
            grinder_type: GrinderType::BurrConical,
            min_setting: 0,
            max_setting: 40,
            scale_type: Some("step".to_string()),
            description: Some("Hand grinder".to_string()),
        }
    }

    #[test]
    fn accepts_a_fully_valid_request() {
        assert!(validate_grinder_request(&valid_request()).is_ok());
    }

    #[test]
    fn rejects_empty_brand() {
        let mut req = valid_request();
        req.brand = String::new();
        assert!(matches!(
            validate_grinder_request(&req),
            Err(GrinderServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_negative_min_setting() {
        let mut req = valid_request();
        req.min_setting = -1;
        assert!(matches!(
            validate_grinder_request(&req),
            Err(GrinderServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_max_not_greater_than_min() {
        let mut req = valid_request();
        req.min_setting = 40;
        req.max_setting = 40;
        assert!(matches!(
            validate_grinder_request(&req),
            Err(GrinderServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_brand_over_length_bound() {
        let mut req = valid_request();
        req.brand = "x".repeat(101);
        assert!(matches!(
            validate_grinder_request(&req),
            Err(GrinderServiceError::Validation(_))
        ));
    }
}
