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

    /// Logs a brew ATOMICALLY: the session insert and the bean-inventory
    /// decrement happen inside ONE transaction.
    ///
    /// LOCKING POLICY (ticket #168): the grinder setting range is validated
    /// against a row locked `FOR UPDATE` inside the save transaction (lock
    /// order: bean then grinder), so a concurrent grinder-range change cannot
    /// produce a session that violates the validated range. Loading and
    /// validating the grinder BEFORE the transaction (as this method used to)
    /// left a time-of-check/time-of-use gap: another transaction could narrow
    /// the grinder's `min_setting`/`max_setting` after validation but before
    /// the insert, committing an out-of-range session. By beginning the
    /// transaction first and re-reading the grinder under `FOR UPDATE`, the
    /// range that validation sees is the exact range held under lock until
    /// commit. The lock order is fixed (bean first, then grinder) so two
    /// concurrent brews can never deadlock by acquiring the two rows in
    /// opposite orders.
    ///
    /// Steps, in order:
    /// 1. `BEGIN` a transaction (everything below runs inside it).
    /// 2. `SELECT ... FOR UPDATE` the bean row to lock it for the duration
    ///    (locked first to define the bean-then-grinder lock order). A missing
    ///    row means the bean does not exist (or is inactive); roll back.
    /// 3. `SELECT ... FOR UPDATE` the grinder row inside the SAME transaction
    ///    (needed for the grind-setting range); a missing/retired grinder rolls
    ///    back and fails with `GrinderNotFound`.
    /// 4. Route the request through `recipe::validate` (ticket #144) against
    ///    the LOCKED grinder so the per-method rules and the grinder range are
    ///    the single source of truth and the validated range is the committed
    ///    range; build the persistable session and attach the free-text notes.
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
        let grinder_id = request.grinder_id;
        let bean_id = request.bean_id;

        // (1) Begin the transaction that ties the lock, insert and decrement
        // together. Both equipment rows are locked INSIDE this transaction so
        // the validated grinder range is the one held under lock until commit.
        let mut tx = begin_tx(self.pool).await?;

        // (2) Lock the bean row for the life of the transaction (locked FIRST
        // to define the bean-then-grinder lock order that prevents deadlocks
        // between concurrent brews). A missing row means the bean does not
        // exist (or is inactive); roll back.
        let remaining: Option<Option<f32>> = sqlx::query_scalar(
            r#"SELECT remaining_grams FROM coffee_beans
               WHERE id = $1 AND is_active = true
               FOR UPDATE"#,
        )
        .bind(bean_id)
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

        // (3) Lock the grinder row inside the SAME transaction (after the bean,
        // per the lock order). Reads the same column list as `get_grinder` so
        // the `Grinder` `FromRow` mapping matches, filtering `is_active = true`
        // so a retired grinder (ticket #165) cannot back a new brew. Holding
        // the row `FOR UPDATE` is what closes the TOCTOU window (ticket #168):
        // its range cannot change between validation and insert.
        let grinder = match lock_grinder(&mut tx, grinder_id).await? {
            Some(grinder) => grinder,
            None => {
                let _ = tx.rollback().await;
                return Err(SaveError::GrinderNotFound);
            }
        };

        // (4) Validate through the recipe module (per-method + grinder range)
        // against the LOCKED grinder, then build the session and attach
        // notes/feedback/suggestions. Because the grinder row is held FOR
        // UPDATE, the range checked here is exactly the range committed below.
        let validated = match recipe::validate(request.to_brew_params(), &grinder) {
            Ok(validated) => validated,
            Err(err) => {
                let _ = tx.rollback().await;
                return Err(SaveError::Recipe(err));
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

/// Loads and LOCKS an ACTIVE grinder by id inside an open transaction
/// (ticket #168).
///
/// Runs `SELECT ... FOR UPDATE` against `&mut *tx` so the grinder row is held
/// for the life of the brew transaction: its setting range cannot change
/// between `recipe::validate` and the session insert, closing the TOCTOU
/// window where a concurrent grinder-range narrowing could commit an
/// out-of-range session. The column list is kept IDENTICAL to
/// `GrinderService::get_grinder` (including the `is_active` column from ticket
/// #165) so the `Grinder` `FromRow` mapping matches, and `is_active = true`
/// ensures a retired grinder surfaces as `None` (mapped to
/// `SaveError::GrinderNotFound` by the caller). Errors are mapped through
/// [`db_error`] like the other locked queries in the save path.
async fn lock_grinder(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    id: Uuid,
) -> std::result::Result<Option<Grinder>, SaveError> {
    sqlx::query_as::<_, Grinder>(
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
    .bind(id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| db_error(e, "Failed to lock grinder row"))
}

/// Wraps a sqlx error as [`SaveError::Database`] with a human-readable context.
///
/// Shared by the transactional save path so every DB failure is mapped the same
/// way. The reachable call sites (bean lock, grinder lock, session insert,
/// inventory decrement, commit) are exercised by the DB integration tests.
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
