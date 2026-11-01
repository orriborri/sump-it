//! Bean service combining features from BeanIt and rustyCoffy
//! Includes inventory management, validation, and comprehensive business logic.
//! `create_bean`/`update_bean` own the bean write invariants (see
//! [`crate::services::WriteError`]).

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{BeanUsageRecord, CoffeeBean, CreateCoffeeBeanRequest};
use crate::services::{validate_write, WriteError};

/// Service for managing coffee beans
pub struct BeanService<'a> {
    pool: &'a PgPool,
}

impl<'a> BeanService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    /// List all coffee beans with pagination
    pub async fn list_beans(
        &self,
        page: Option<i32>,
        limit: Option<i32>,
    ) -> Result<(Vec<CoffeeBean>, i64)> {
        // Clamp through the single source of truth (`crate::pagination`) rather
        // than hand-written literals, so the policy (DEFAULT_LIMIT=50,
        // MAX_LIMIT=100) can never silently drift from the module the handler
        // uses to derive page_size/has_more. The handler already passes
        // normalized values, so this call is idempotent; keeping it means the
        // SQL window stays correct even if the service is called with raw values.
        let pagination = crate::pagination::Pagination::from_page(page, limit);
        let limit = pagination.limit;
        let offset = pagination.offset;

        // Get total count
        let total: i64 =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM coffee_beans WHERE is_active = true"#)
                .fetch_one(self.pool)
                .await
                .context("Failed to count beans")?;

        // Get paginated results
        let beans = sqlx::query_as::<_, CoffeeBean>(
            r#"
            SELECT 
                id, name, origin, roast_date, purchase_date, 
                remaining_grams, variety, processing_method, is_active,
                created_at, updated_at
            FROM coffee_beans
            WHERE is_active = true
            ORDER BY roast_date DESC, name ASC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(self.pool)
        .await
        .context("Failed to fetch beans")?;

        Ok((beans, total))
    }

    /// Create a new coffee bean.
    ///
    /// Validates the request (field lengths, then the bean business rules)
    /// BEFORE any database access, so invalid data cannot be persisted by any
    /// caller.
    pub async fn create_bean(
        &self,
        request: CreateCoffeeBeanRequest,
    ) -> std::result::Result<CoffeeBean, WriteError> {
        validate_write(&request, CreateCoffeeBeanRequest::validate_comprehensive)?;
        let now = Utc::now();

        let bean = sqlx::query_as::<_, CoffeeBean>(
            r#"
            INSERT INTO coffee_beans (
                id, name, origin, roast_date, purchase_date, 
                remaining_grams, variety, processing_method, is_active,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING 
                id, name, origin, roast_date, purchase_date, 
                remaining_grams, variety, processing_method, is_active,
                created_at, updated_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(request.name)
        .bind(request.origin)
        .bind(request.roast_date)
        .bind(request.purchase_date)
        .bind(request.remaining_grams)
        .bind(request.variety)
        .bind(request.processing_method)
        .bind(true) // is_active
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await
        .context("Failed to create bean")
        .map_err(WriteError::Database)?;

        Ok(bean)
    }

    /// Get a specific coffee bean by ID
    pub async fn get_bean(&self, id: Uuid) -> Result<Option<CoffeeBean>> {
        let bean = sqlx::query_as::<_, CoffeeBean>(
            r#"
            SELECT 
                id, name, origin, roast_date, purchase_date, 
                remaining_grams, variety, processing_method, is_active,
                created_at, updated_at
            FROM coffee_beans
            WHERE id = $1 AND is_active = true
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await
        .context("Failed to fetch bean")?;

        Ok(bean)
    }

    /// Update a coffee bean.
    ///
    /// Applies the same validation as [`Self::create_bean`] BEFORE any
    /// database access.
    pub async fn update_bean(
        &self,
        id: Uuid,
        request: CreateCoffeeBeanRequest,
    ) -> std::result::Result<Option<CoffeeBean>, WriteError> {
        validate_write(&request, CreateCoffeeBeanRequest::validate_comprehensive)?;
        let now = Utc::now();

        let bean = sqlx::query_as::<_, CoffeeBean>(
            r#"
            UPDATE coffee_beans
            SET 
                name = $2,
                origin = $3,
                roast_date = $4,
                purchase_date = $5,
                remaining_grams = $6,
                variety = $7,
                processing_method = $8,
                updated_at = $9
            WHERE id = $1 AND is_active = true
            RETURNING 
                id, name, origin, roast_date, purchase_date, 
                remaining_grams, variety, processing_method, is_active,
                created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(request.name)
        .bind(request.origin)
        .bind(request.roast_date)
        .bind(request.purchase_date)
        .bind(request.remaining_grams)
        .bind(request.variety)
        .bind(request.processing_method)
        .bind(now)
        .fetch_optional(self.pool)
        .await
        .context("Failed to update bean")
        .map_err(WriteError::Database)?;

        Ok(bean)
    }

    /// Delete a coffee bean (soft delete)
    pub async fn delete_bean(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE coffee_beans
            SET is_active = false, updated_at = $2
            WHERE id = $1 AND is_active = true
            "#,
        )
        .bind(id)
        .bind(Utc::now())
        .execute(self.pool)
        .await
        .context("Failed to delete bean")?;

        Ok(result.rows_affected() > 0)
    }

    /// Get only active beans with remaining quantity > 0
    pub async fn get_active_beans(&self) -> Result<Vec<CoffeeBean>> {
        let beans = sqlx::query_as::<_, CoffeeBean>(
            r#"
            SELECT 
                id, name, origin, roast_date, purchase_date, 
                remaining_grams, variety, processing_method, is_active,
                created_at, updated_at
            FROM coffee_beans
            WHERE is_active = true 
            AND (remaining_grams > 0 OR remaining_grams IS NULL)
            ORDER BY name ASC
            "#,
        )
        .fetch_all(self.pool)
        .await
        .context("Failed to fetch active beans")?;

        Ok(beans)
    }

    /// Get usage history for a bean (from rustyCoffy)
    pub async fn get_bean_usage_history(&self, bean_id: Uuid) -> Result<Vec<BeanUsageRecord>> {
        let history = sqlx::query_as::<_, BeanUsageRecord>(
            r#"
            SELECT 
                bs.id as session_id,
                bs.created_at as brew_date,
                bs.coffee_grams as grams_used,
                bs.rating,
                g.brand || ' ' || g.model as grinder_used,
                bs.brewing_method::text as brewing_method,
                bs.tasting_notes
            FROM brewing_sessions bs
            JOIN grinders g ON bs.grinder_id = g.id
            WHERE bs.bean_id = $1
            ORDER BY bs.created_at DESC
            "#,
        )
        .bind(bean_id)
        .fetch_all(self.pool)
        .await
        .context("Failed to fetch bean usage history")?;

        Ok(history)
    }
}

#[cfg(test)]
mod tests {
    //! Service-seam tests: invalid bean data is rejected by `BeanService`
    //! itself, without going through the HTTP router and BEFORE any database
    //! round trip (the pool points at an unreachable address and is never
    //! connected).
    use super::*;
    use crate::services::WriteError;
    use crate::validation::ValidationErrorType;
    use chrono::{Duration, NaiveDate};
    use sqlx::postgres::PgPoolOptions;

    fn unreachable_pool() -> PgPool {
        PgPoolOptions::new()
            .connect_lazy("postgres://nobody@127.0.0.1:1/unreachable")
            .expect("lazy pool")
    }

    fn valid_request() -> CreateCoffeeBeanRequest {
        CreateCoffeeBeanRequest {
            name: "Yirgacheffe".to_string(),
            origin: "Ethiopia".to_string(),
            roast_date: NaiveDate::from_ymd_opt(2024, 1, 1).expect("date"),
            purchase_date: NaiveDate::from_ymd_opt(2024, 1, 3).expect("date"),
            remaining_grams: Some(250.0),
            variety: None,
            processing_method: None,
        }
    }

    #[tokio::test]
    async fn create_bean_rejects_empty_name_as_invalid_fields() {
        let pool = unreachable_pool();
        let request = CreateCoffeeBeanRequest {
            name: String::new(),
            ..valid_request()
        };

        let err = BeanService::new(&pool)
            .create_bean(request)
            .await
            .unwrap_err();

        assert!(matches!(err, WriteError::InvalidFields(ref details) if details.contains("name")));
    }

    #[tokio::test]
    async fn create_bean_rejects_future_roast_date_as_rule_violation() {
        let pool = unreachable_pool();
        let request = CreateCoffeeBeanRequest {
            roast_date: Utc::now().date_naive() + Duration::days(5),
            ..valid_request()
        };

        let err = BeanService::new(&pool)
            .create_bean(request)
            .await
            .unwrap_err();

        assert!(matches!(
            err,
            WriteError::Rule(ValidationErrorType::RoastDateInFuture)
        ));
    }

    #[tokio::test]
    async fn create_bean_rejects_whitespace_name_as_rule_violation() {
        let pool = unreachable_pool();
        let request = CreateCoffeeBeanRequest {
            name: "   ".to_string(),
            ..valid_request()
        };

        let err = BeanService::new(&pool)
            .create_bean(request)
            .await
            .unwrap_err();

        assert!(matches!(
            err,
            WriteError::Rule(ValidationErrorType::BeanNameEmpty)
        ));
    }

    #[tokio::test]
    async fn update_bean_rejects_negative_remaining_grams_as_rule_violation() {
        let pool = unreachable_pool();
        let request = CreateCoffeeBeanRequest {
            remaining_grams: Some(-1.0),
            ..valid_request()
        };

        let err = BeanService::new(&pool)
            .update_bean(Uuid::new_v4(), request)
            .await
            .unwrap_err();

        assert!(matches!(
            err,
            WriteError::Rule(ValidationErrorType::NegativeRemainingGrams { .. })
        ));
    }

    #[tokio::test]
    async fn update_bean_rejects_overlong_origin_as_invalid_fields() {
        let pool = unreachable_pool();
        let request = CreateCoffeeBeanRequest {
            origin: "x".repeat(101),
            ..valid_request()
        };

        let err = BeanService::new(&pool)
            .update_bean(Uuid::new_v4(), request)
            .await
            .unwrap_err();

        assert!(
            matches!(err, WriteError::InvalidFields(ref details) if details.contains("origin"))
        );
    }
}
