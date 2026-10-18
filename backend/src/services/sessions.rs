//! Brewing-session service: the transactional save path for ticket #145.
//!
//! Follows the same runtime-sqlx pattern as `services/beans.rs` and
//! `services/grinders.rs` (connection via `PgPool`, `sqlx::query_as`, `anyhow`
//! results) so the crate builds without a live database. All pure brewing
//! logic lives in the library crate (`models`, `recipe`, `validation`) and is
//! unit tested there; this service owns only the SQL and the transaction
//! orchestration, which is exercised by the `#[ignore]`d DB integration tests
//! under `backend/tests/` (no Postgres in this sandbox).

use anyhow::{Context, Result};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{apply_notes_to_session, BrewingSession, CreateBrewingSessionRequest, Grinder};
use crate::recipe;
use crate::validation::ValidationErrorType;

/// Why a save failed. The API layer maps each case to an HTTP status and an
/// `ErrorResponse`, so the variants carry everything the client needs.
#[derive(Debug)]
pub enum SaveError {
    /// The selected grinder does not exist, so the grind-setting range cannot
    /// be validated.
    GrinderNotFound,
    /// The selected bean does not exist (or is inactive).
    BeanNotFound,
    /// A per-method recipe rule (or the grind-vs-grinder range) was violated.
    Recipe(ValidationErrorType),
    /// The tracked bean does not have enough coffee for this brew. Carries the
    /// available and required grams so the message is actionable; the whole
    /// save is rolled back (never a silent clamp).
    InsufficientQuantity { available: f32, required: f32 },
    /// Any underlying database/transaction failure.
    Database(anyhow::Error),
}

/// Service for persisting brewing sessions.
pub struct SessionService<'a> {
    pool: &'a PgPool,
}

impl<'a> SessionService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    /// Logs a brew ATOMICALLY: the session insert and the bean-inventory
    /// decrement happen inside ONE transaction.
    ///
    /// Steps, in order:
    /// 1. Load the selected grinder (needed for the grind-setting range).
    /// 2. Route the request through `recipe::validate` (ticket #144) so the
    ///    per-method rules and the grinder range are the single source of
    ///    truth; build the persistable session and attach the free-text notes.
    /// 3. `BEGIN` a transaction.
    /// 4. `SELECT ... FOR UPDATE` the bean row to lock it for the duration.
    /// 5. If the bean tracks quantity (`remaining_grams IS NOT NULL`) and has
    ///    less than the required dose, roll back and fail with the available
    ///    and required grams. Untracked beans (`NULL`) never block.
    /// 6. Insert the session.
    /// 7. Decrement `remaining_grams` by the coffee dose (only when tracked);
    ///    no `GREATEST(0, ...)` clamp, because step 5 already guaranteed
    ///    sufficiency.
    /// 8. `COMMIT`. Any failure after `BEGIN` rolls the whole thing back.
    pub async fn log_brew(
        &self,
        request: CreateBrewingSessionRequest,
    ) -> std::result::Result<BrewingSession, SaveError> {
        // (1) Load the grinder so the recipe can check the grind setting
        // against this grinder's physical range.
        let grinder = self
            .get_grinder(request.grinder_id)
            .await
            .map_err(SaveError::Database)?
            .ok_or(SaveError::GrinderNotFound)?;

        // (2) Validate through the recipe module (per-method + grinder range),
        // then build the session and attach notes/feedback/suggestions.
        let validated =
            recipe::validate(request.to_brew_params(), &grinder).map_err(SaveError::Recipe)?;
        let coffee_required = validated.params().coffee_grams;
        let session = validated.into_session(Uuid::new_v4(), chrono::Utc::now());
        let session = apply_notes_to_session(session, &request);

        // (3) Begin the transaction that ties the insert and decrement together.
        let mut tx = self.pool.begin().await.map_err(|e| {
            SaveError::Database(anyhow::Error::new(e).context("Failed to begin transaction"))
        })?;

        // (4) Lock the bean row for the life of the transaction. A missing row
        // means the bean does not exist (or is inactive); roll back.
        let remaining: Option<Option<f32>> = sqlx::query_scalar(
            r#"SELECT remaining_grams FROM coffee_beans
               WHERE id = $1 AND is_active = true
               FOR UPDATE"#,
        )
        .bind(session.bean_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| {
            SaveError::Database(anyhow::Error::new(e).context("Failed to lock bean row"))
        })?;

        let remaining = match remaining {
            Some(value) => value,
            None => {
                // Explicit rollback; dropping `tx` would also roll back, but
                // being explicit documents the intent.
                let _ = tx.rollback().await;
                return Err(SaveError::BeanNotFound);
            }
        };

        // (5) Sufficiency check. Untracked beans (NULL) never block; tracked
        // beans must have at least the required dose or the WHOLE save fails.
        if let Some(available) = remaining {
            if available < coffee_required {
                let _ = tx.rollback().await;
                return Err(SaveError::InsufficientQuantity {
                    available,
                    required: coffee_required,
                });
            }
        }

        // (6) Insert the session inside the transaction. `coffee_ratio` is a
        // GENERATED column, so it is not written here.
        let inserted = sqlx::query_as::<_, BrewingSession>(
            r#"
            INSERT INTO brewing_sessions (
                id, bean_id, grinder_id, brewing_method, grind_setting,
                water_temp_celsius, brew_time_seconds, coffee_grams, water_grams,
                rating, tasting_notes, feedback, suggestions, is_template,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING
                id, bean_id, grinder_id, brewing_method, grind_setting,
                water_temp_celsius, brew_time_seconds, coffee_grams, water_grams,
                rating, tasting_notes, feedback, suggestions, is_template,
                coffee_ratio, created_at, updated_at
            "#,
        )
        .bind(session.id)
        .bind(session.bean_id)
        .bind(session.grinder_id)
        .bind(&session.brewing_method)
        .bind(session.grind_setting)
        .bind(session.water_temp_celsius)
        .bind(session.brew_time_seconds)
        .bind(session.coffee_grams)
        .bind(session.water_grams)
        .bind(session.rating)
        .bind(&session.tasting_notes)
        .bind(&session.feedback)
        .bind(&session.suggestions)
        .bind(session.is_template)
        .bind(session.created_at)
        .bind(session.updated_at)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            SaveError::Database(anyhow::Error::new(e).context("Failed to insert session"))
        })?;

        // (7) Decrement the tracked inventory. No GREATEST clamp: step (5)
        // proved there is enough, so an exact subtraction is correct and a
        // negative result would indicate a logic error rather than be hidden.
        if remaining.is_some() {
            sqlx::query(
                r#"UPDATE coffee_beans
                   SET remaining_grams = remaining_grams - $2,
                       updated_at = $3
                   WHERE id = $1"#,
            )
            .bind(session.bean_id)
            .bind(coffee_required)
            .bind(chrono::Utc::now())
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                SaveError::Database(
                    anyhow::Error::new(e).context("Failed to decrement bean quantity"),
                )
            })?;
        }

        // (8) Commit: the session and the decrement land together or not at all.
        tx.commit().await.map_err(|e| {
            SaveError::Database(anyhow::Error::new(e).context("Failed to commit transaction"))
        })?;

        Ok(inserted)
    }

    /// Lists the most recent brewing sessions, newest first. Used by the
    /// stepper to show previous brews.
    pub async fn list_recent(&self, limit: Option<i32>) -> Result<(Vec<BrewingSession>, i64)> {
        let limit = limit.unwrap_or(5).clamp(1, 100);

        let total: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM brewing_sessions"#)
            .fetch_one(self.pool)
            .await
            .context("Failed to count sessions")?;

        let sessions = sqlx::query_as::<_, BrewingSession>(
            r#"
            SELECT
                id, bean_id, grinder_id, brewing_method, grind_setting,
                water_temp_celsius, brew_time_seconds, coffee_grams, water_grams,
                rating, tasting_notes, feedback, suggestions, is_template,
                coffee_ratio, created_at, updated_at
            FROM brewing_sessions
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit as i64)
        .fetch_all(self.pool)
        .await
        .context("Failed to fetch recent sessions")?;

        Ok((sessions, total))
    }

    /// Loads a grinder by id (needed to validate the grind setting).
    async fn get_grinder(&self, id: Uuid) -> Result<Option<Grinder>> {
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
}
