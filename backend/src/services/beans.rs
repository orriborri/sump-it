//! Bean service combining features from BeanIt and rustyCoffy
//! Includes inventory management, validation, and comprehensive business logic

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use anyhow::{Result, Context};

use crate::models::{BeanUsageRecord, CoffeeBean, CreateCoffeeBeanRequest};
use crate::pagination::Pagination;

/// Service for managing coffee beans
pub struct BeanService<'a> {
    pool: &'a PgPool,
}

impl<'a> BeanService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }
    
    /// List all coffee beans with pagination.
    ///
    /// The caller passes a normalized [`Pagination`] (the single source of
    /// truth for `limit`/`offset`), so the `LIMIT`/`OFFSET` used here and the
    /// `page_size`/`has_more` the handler reports are derived from the SAME
    /// clamped values and cannot drift (ticket #167).
    pub async fn list_beans(&self, pagination: Pagination) -> Result<(Vec<CoffeeBean>, i64)> {
        let limit = pagination.limit();
        let offset = pagination.offset();

        // Get total count
        let total: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM coffee_beans WHERE is_active = true"#
        )
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
            "#
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
    /// The service OWNS the bean invariants (ticket #166): it validates the
    /// request through the shared [`CreateCoffeeBeanRequest::validate_comprehensive`]
    /// rules BEFORE issuing the INSERT, so invalid data is rejected at the
    /// service seam independent of any HTTP handler. The handler keeps its own
    /// validation as supplemental fast feedback; both call the same shared
    /// check, so the rule body is not duplicated.
    pub async fn create_bean(&self, request: CreateCoffeeBeanRequest) -> Result<CoffeeBean> {
        request
            .validate_comprehensive()
            .context("Bean validation failed")?;

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
            "#
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
        .context("Failed to create bean")?;
        
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
            "#
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await
        .context("Failed to fetch bean")?;
        
        Ok(bean)
    }
    
    /// Update a coffee bean.
    ///
    /// Mirrors [`Self::create_bean`]: the same shared bean invariants are
    /// enforced at the service seam before the UPDATE (ticket #166).
    pub async fn update_bean(&self, id: Uuid, request: CreateCoffeeBeanRequest) -> Result<Option<CoffeeBean>> {
        request
            .validate_comprehensive()
            .context("Bean validation failed")?;

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
            "#
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
        .context("Failed to update bean")?;
        
        Ok(bean)
    }
    
    /// Delete a coffee bean (soft delete)
    pub async fn delete_bean(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE coffee_beans
            SET is_active = false, updated_at = $2
            WHERE id = $1 AND is_active = true
            "#
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
            "#
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
            "#
        )
        .bind(bean_id)
        .fetch_all(self.pool)
        .await
        .context("Failed to fetch bean usage history")?;
        
        Ok(history)
    }
}