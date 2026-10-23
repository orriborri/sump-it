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
    /// The caller passes a normalized [`Pagination`] (the single source of
    /// truth for `limit`/`offset`), so the `LIMIT`/`OFFSET` used here and the
    /// `page_size`/`has_more` the handler reports are derived from the SAME
    /// clamped values and cannot drift (ticket #167).
    pub async fn list_grinders(&self, pagination: Pagination) -> Result<(Vec<Grinder>, i64)> {
        let limit = pagination.limit();
        let offset = pagination.offset();

        // Only ACTIVE grinders appear in listings; retired (soft-deleted)
        // grinders are filtered out here but remain joinable from historical
        // sessions (ticket #165).
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
    /// The service OWNS the grinder invariants (ticket #166): it validates the
    /// request through the shared [`CreateGrinderRequest::validate_comprehensive`]
    /// rules (non-empty brand, `min_setting >= 0`, `max_setting > min_setting`)
    /// BEFORE the INSERT, so invalid data is rejected at the service seam
    /// independent of any HTTP handler. The handler keeps its own validation as
    /// supplemental fast feedback; both call the same shared check.
    ///
    /// STATUS-CODE NOTE (code-review #166): on the HTTP path the handler runs
    /// `validate_grinder_request` FIRST and returns a 400 for invalid input, so
    /// the client always sees 400. This service-seam rejection is a BACKSTOP for
    /// direct (non-HTTP) callers; it reports the failure as an `anyhow` error,
    /// which the handler's catch-all maps to 500. We deliberately keep
    /// handler-first validation rather than threading a typed validation error
    /// through the service: the ticket only requires the service to REJECT
    /// invalid data independent of the handler (it does, see the DB test
    /// `create_grinder_rejects_invalid_data_at_service_layer`), and the
    /// observable API status is already correct. Introducing a typed
    /// service-error-to-400 mapping here would touch the whole service/handler
    /// error surface for a path no client reaches, so it is intentionally left
    /// as a backstop.
    pub async fn create_grinder(&self, request: CreateGrinderRequest) -> Result<Grinder> {
        request
            .validate_comprehensive()
            .context("Grinder validation failed")?;

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

    /// Get a specific ACTIVE grinder by ID.
    ///
    /// Mirrors `BeanService::get_bean`: a retired (soft-deleted) grinder is
    /// treated as "not found" by the API surface (ticket #165), so the handler
    /// returns 404 for it. Historical sessions still reach the row through the
    /// session service's own unfiltered lookup, keeping their joins intact.
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
    /// Mirrors [`Self::create_grinder`]: the same shared grinder invariants are
    /// enforced at the service seam before the UPDATE (ticket #166).
    pub async fn update_grinder(
        &self,
        id: Uuid,
        request: CreateGrinderRequest,
    ) -> Result<Option<Grinder>> {
        request
            .validate_comprehensive()
            .context("Grinder validation failed")?;

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

    /// Retire a grinder (SOFT delete).
    ///
    /// Mirrors `BeanService::delete_bean` (ticket #165): instead of removing
    /// the row - which, under the old `ON DELETE CASCADE` foreign key, silently
    /// destroyed every brewing session that referenced the grinder - this flips
    /// `is_active` to false. The grinder disappears from active listings
    /// (`list_grinders` filters `is_active = true`) but stays joinable from
    /// historical sessions, so NO `brewing_sessions` row is ever deleted.
    /// Returns whether an active grinder was retired (false if already retired
    /// or missing).
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
