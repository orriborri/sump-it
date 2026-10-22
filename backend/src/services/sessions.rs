//! Brewing-session service: the transactional save path for ticket #145.
//!
//! Follows the same runtime-sqlx pattern as `services/beans.rs` and
//! `services/grinders.rs` (connection via `PgPool`, `sqlx::query_as`, `anyhow`
//! results) so the crate builds without a live database. All pure brewing
//! logic lives in the library crate (`models`, `recipe`, `validation`) and is
//! unit tested there; this service owns only the SQL and the transaction
//! orchestration, which is exercised by the `#[ignore]`d DB integration tests
//! under `backend/tests/`. Those tests require a live Postgres named by
//! `DATABASE_URL`/`TEST_DATABASE_URL`; they are `#[ignore]`d so a plain
//! `cargo test` without a database stays green, and are run against a real
//! Postgres by `make coverage-backend` and the backend-coverage CI job.

use anyhow::{Context, Result};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    apply_notes_to_session, BrewingSession, CreateBrewingSessionRequest, Grinder, SessionFilter,
};
use crate::recipe;
use crate::session_query::{self, QueryBind};
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
    /// The session to duplicate does not exist.
    SessionNotFound,
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

    /// Logs a brew ATOMICALLY: grinder-range validation, the session insert and
    /// the bean-inventory decrement all happen inside ONE transaction, under
    /// row locks, so no step can observe stale state.
    ///
    /// GRINDER SNAPSHOT / LOCK POLICY (ticket #168):
    /// The grind setting is validated against the grinder's `min_setting` /
    /// `max_setting` range. If the grinder were loaded and validated BEFORE the
    /// transaction (as it was originally), a concurrent edit to that range
    /// could slip in between validation and the insert - a classic
    /// time-of-check/time-of-use (TOCTOU) race that could persist a session
    /// whose grind setting is out of range for the grinder's CURRENT range. To
    /// close it, the grinder is loaded `SELECT ... FOR UPDATE` INSIDE the
    /// transaction and `recipe::validate` runs against THAT locked snapshot, so
    /// the range cannot change between the check and the insert/commit.
    ///
    /// LOCK ORDER: bean first, then grinder. Both the bean and the grinder are
    /// locked `FOR UPDATE` in the SAME transaction; always acquiring them in
    /// this fixed order (bean, then grinder) means two concurrent `log_brew`
    /// calls can never hold one lock while waiting on the other in the opposite
    /// direction, so there is no lock-ordering deadlock between them.
    ///
    /// Steps, in order:
    /// 1. `BEGIN` a transaction (ties validation, insert and decrement together).
    /// 2. `SELECT ... FOR UPDATE` the bean row to lock it for the duration. A
    ///    missing row means the bean does not exist (or is inactive); roll back.
    /// 3. `SELECT ... FOR UPDATE` the grinder row to lock it (and snapshot its
    ///    setting range) for the duration. A missing/retired grinder rolls back.
    /// 4. Route the locked grinder snapshot and the request through
    ///    `recipe::validate` (ticket #144) so the per-method rules and the
    ///    grinder range are the single source of truth; build the persistable
    ///    session and attach the free-text notes. A rule violation rolls back.
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
        // (1) Begin the transaction FIRST, so the grinder-range check (step 4)
        // runs against a row locked for the life of the save - no concurrent
        // edit can slip between validation and the insert (ticket #168 TOCTOU).
        let mut tx = begin_tx(self.pool).await?;

        // (2) Lock the bean row for the life of the transaction (lock order:
        // bean BEFORE grinder). A missing row means the bean does not exist (or
        // is inactive); roll back.
        let remaining: Option<Option<f32>> = sqlx::query_scalar(
            r#"SELECT remaining_grams FROM coffee_beans
               WHERE id = $1 AND is_active = true
               FOR UPDATE"#,
        )
        .bind(request.bean_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| db_error(e, "Failed to lock bean row"))?;

        let remaining = match remaining {
            Some(value) => value,
            None => {
                // Explicit rollback; dropping `tx` would also roll back, but
                // being explicit documents the intent.
                let _ = tx.rollback().await;
                return Err(SaveError::BeanNotFound);
            }
        };

        // (3) Lock the grinder row (lock order: grinder AFTER bean) and snapshot
        // its setting range for the life of the transaction, so the range
        // cannot change between the check in step (4) and the commit. A
        // missing/retired grinder rolls back. The `is_active = true` filter
        // means retiring a grinder (ticket #165 soft delete) stops new brews
        // from being logged against it, while existing sessions survive.
        let grinder_row = sqlx::query_as::<_, Grinder>(
            r#"
            SELECT
                id, brand, model, grinder_type,
                min_setting, max_setting, scale_type, description, is_active,
                created_at, updated_at
            FROM grinders
            WHERE id = $1 AND is_active = true
            FOR UPDATE
            "#,
        )
        .bind(request.grinder_id)
        .fetch_optional(&mut *tx)
        .await;

        let grinder = match grinder_row {
            Ok(Some(grinder)) => grinder,
            Ok(None) => {
                let _ = tx.rollback().await;
                return Err(SaveError::GrinderNotFound);
            }
            Err(e) => {
                let _ = tx.rollback().await;
                return Err(db_error(e, "Failed to lock grinder row"));
            }
        };

        // (4) Validate through the recipe module (per-method + grinder range)
        // against the LOCKED grinder snapshot, then build the session and
        // attach notes/feedback/suggestions. A rule violation rolls back.
        let validated = match recipe::validate(request.to_brew_params(), &grinder) {
            Ok(validated) => validated,
            Err(e) => {
                let _ = tx.rollback().await;
                return Err(SaveError::Recipe(e));
            }
        };
        let coffee_required = validated.params().coffee_grams;
        let session = validated.into_session(Uuid::new_v4(), chrono::Utc::now());
        let session = apply_notes_to_session(session, &request);

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
        .map_err(|e| db_error(e, "Failed to insert session"))?;

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
            .map_err(|e| db_error(e, "Failed to decrement bean quantity"))?;
        }

        // (8) Commit: the session and the decrement land together or not at all.
        tx.commit()
            .await
            .map_err(|e| db_error(e, "Failed to commit transaction"))?;

        Ok(inserted)
    }

    /// Loads a single brewing session by id.
    pub async fn get_session(&self, id: Uuid) -> Result<Option<BrewingSession>> {
        let session = sqlx::query_as::<_, BrewingSession>(
            r#"
            SELECT
                id, bean_id, grinder_id, brewing_method, grind_setting,
                water_temp_celsius, brew_time_seconds, coffee_grams, water_grams,
                rating, tasting_notes, feedback, suggestions, is_template,
                coffee_ratio, created_at, updated_at
            FROM brewing_sessions
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await
        .context("Failed to fetch session")?;

        Ok(session)
    }

    /// Duplicates an existing session (ticket #146).
    ///
    /// The duplicate re-brews the SAME recipe, so it goes through the EXACT
    /// same path as a brand new brew: load the original, build a
    /// [`CreateBrewingSessionRequest`] from its PARAMETERS ONLY (dropping
    /// rating, tasting notes, feedback, suggestions and the template flag via
    /// [`BrewingSession::to_duplicate_request`]), then hand it to
    /// [`Self::log_brew`]. That means duplicating also runs `recipe::validate`
    /// and the transactional inventory decrement, and can fail with
    /// [`SaveError::InsufficientQuantity`] exactly like a new brew. The
    /// original row is never copy-inserted directly.
    pub async fn duplicate(
        &self,
        id: Uuid,
    ) -> std::result::Result<BrewingSession, SaveError> {
        let original = self
            .get_session(id)
            .await
            .map_err(SaveError::Database)?
            .ok_or(SaveError::SessionNotFound)?;

        let request = original.to_duplicate_request();
        self.log_brew(request).await
    }

    /// Lists brewing sessions newest-first with paging, applying the given
    /// filters and optional case-insensitive text search (ticket #146).
    ///
    /// The SQL text, placeholder numbering and pagination clamping are built by
    /// the pure [`crate::session_query`] helpers (unit tested without a DB);
    /// this method only binds the parameters and runs the queries. Every user
    /// value travels as a bound parameter, so there is no SQL injection
    /// surface. Returns the page of sessions plus the TOTAL match count.
    pub async fn list_filtered(
        &self,
        filter: &SessionFilter,
        search: Option<&str>,
    ) -> Result<(Vec<BrewingSession>, i64)> {
        // The COUNT(*) is read through `query_as` into a one-column tuple so it
        // shares the single `bind_all` binder with the list query below (rather
        // than a second, near-identical `query_scalar` binder whose extra bind
        // arms the count query - which never carries limit/offset - could never
        // exercise).
        let count_query = session_query::count_sessions_sql(filter, search);
        let count_builder = sqlx::query_as::<_, (i64,)>(&count_query.sql);
        let count_builder = bind_all(count_builder, &count_query.binds);
        let (total,) = count_builder
            .fetch_one(self.pool)
            .await
            .context("Failed to count filtered sessions")?;

        let list_query = session_query::list_sessions_sql(filter, search);
        let list_builder = sqlx::query_as::<_, BrewingSession>(&list_query.sql);
        let list_builder = bind_all(list_builder, &list_query.binds);
        let sessions = list_builder
            .fetch_all(self.pool)
            .await
            .context("Failed to fetch filtered sessions")?;

        Ok((sessions, total))
    }
}

/// Wraps a sqlx error as [`SaveError::Database`] with a human-readable context.
///
/// Shared by the transactional save path so every DB failure is mapped the same
/// way. The reachable call sites (bean lock, session insert, inventory
/// decrement, commit) are exercised by the DB integration tests.
fn db_error(e: sqlx::Error, context: &'static str) -> SaveError {
    SaveError::Database(anyhow::Error::new(e).context(context))
}

// coverage: defensive wiring - opening a transaction only fails if the pool /
// connection is already dead (process/infra failure), which cannot be provoked
// by construction once we hold a live pool. Excluded per docs/coverage.md
// (defensive, genuinely-unreachable branch). The happy path returns the tx.
#[cfg_attr(coverage_nightly, coverage(off))]
async fn begin_tx(pool: &PgPool) -> std::result::Result<sqlx::Transaction<'_, sqlx::Postgres>, SaveError> {
    pool.begin()
        .await
        .map_err(|e| db_error(e, "Failed to begin transaction"))
}

/// Binds every [`QueryBind`], in order, to a `query_as` builder.
///
/// `QueryBind` keeps each value typed, so the driver encodes it as a real bind
/// parameter (no string interpolation). The match is exhaustive over the enum,
/// so adding a new bind kind forces an update here.
fn bind_all<'q, O>(
    query: sqlx::query::QueryAs<'q, sqlx::Postgres, O, sqlx::postgres::PgArguments>,
    binds: &'q [QueryBind],
) -> sqlx::query::QueryAs<'q, sqlx::Postgres, O, sqlx::postgres::PgArguments> {
    let mut query = query;
    for bind in binds {
        query = match bind {
            QueryBind::Text(value) => query.bind(value),
            QueryBind::Date(value) => query.bind(value),
            QueryBind::Grinder(value) => query.bind(value),
            QueryBind::Method(value) => query.bind(value),
            QueryBind::Float(value) => query.bind(value),
            QueryBind::Pattern(value) => query.bind(value),
            QueryBind::Int(value) => query.bind(value),
        };
    }
    query
}
