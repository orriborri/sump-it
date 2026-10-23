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
    /// Normalization goes through the shared [`Pagination`] value object
    /// (ticket #167): the same clamped `page_size`/`offset` drive BOTH the SQL
    /// below and the handler's response metadata, so a client can never see a
    /// `page_size`/`has_more` computed from an unclamped request.
    pub async fn list_beans(
        &self,
        page: Option<i32>,
        limit: Option<i32>,
    ) -> Result<(Vec<CoffeeBean>, i64, Pagination)> {
        let pagination = Pagination::from_request(page, limit);
        let limit = pagination.limit();
        let offset = pagination.offset;
        
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
        
        Ok((beans, total, pagination))
    }
    
    /// Create a new coffee bean.
    ///
    /// Business-rule validation runs HERE at the service seam (ticket #166):
    /// the request is checked with `validate_comprehensive` (non-empty
    /// name/origin, no future roast/purchase dates, non-negative remaining
    /// grams) before any SQL, so a create through the service rejects invalid
    /// data regardless of the HTTP handler. Handler-level validation remains
    /// only as supplemental fast feedback.
    pub async fn create_bean(&self, request: CreateCoffeeBeanRequest) -> Result<CoffeeBean> {
        request
            .validate_comprehensive()
            .map_err(|e| anyhow::anyhow!(e.to_string()))?;

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
    /// Validates the request at the service seam (ticket #166) before the SQL,
    /// identically to [`Self::create_bean`].
    pub async fn update_bean(&self, id: Uuid, request: CreateCoffeeBeanRequest) -> Result<Option<CoffeeBean>> {
        request
            .validate_comprehensive()
            .map_err(|e| anyhow::anyhow!(e.to_string()))?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    /// A lazily-connected pool to a URL that is NEVER contacted: the
    /// service-layer validation (ticket #166) rejects an invalid request
    /// BEFORE any SQL runs, so these tests prove the service is the
    /// authoritative seam without needing a live database.
    fn lazy_pool() -> PgPool {
        PgPool::connect_lazy("postgres://invalid:invalid@127.0.0.1:1/nonexistent")
            .expect("lazy pool construction never connects")
    }

    fn valid_request() -> CreateCoffeeBeanRequest {
        let today = Utc::now().naive_utc().date();
        CreateCoffeeBeanRequest {
            name: "Ethiopia Yirgacheffe".to_string(),
            origin: "Ethiopia".to_string(),
            roast_date: today - Duration::days(5),
            purchase_date: today - Duration::days(3),
            remaining_grams: Some(250.0),
            variety: Some("Heirloom".to_string()),
            processing_method: Some("Washed".to_string()),
        }
    }

    #[tokio::test]
    async fn create_bean_rejects_empty_name_at_service_layer() {
        let pool = lazy_pool();
        let service = BeanService::new(&pool);
        let err = service
            .create_bean(CreateCoffeeBeanRequest {
                name: "   ".to_string(),
                ..valid_request()
            })
            .await
            .expect_err("empty name must be rejected by the service");
        assert!(err.to_string().to_lowercase().contains("name"));
    }

    #[tokio::test]
    async fn create_bean_rejects_future_roast_date_at_service_layer() {
        let pool = lazy_pool();
        let service = BeanService::new(&pool);
        let today = Utc::now().naive_utc().date();
        let err = service
            .create_bean(CreateCoffeeBeanRequest {
                roast_date: today + Duration::days(1),
                ..valid_request()
            })
            .await
            .expect_err("future roast date must be rejected by the service");
        assert!(err.to_string().to_lowercase().contains("future"));
    }

    #[tokio::test]
    async fn create_bean_rejects_negative_remaining_grams_at_service_layer() {
        let pool = lazy_pool();
        let service = BeanService::new(&pool);
        let err = service
            .create_bean(CreateCoffeeBeanRequest {
                remaining_grams: Some(-10.0),
                ..valid_request()
            })
            .await
            .expect_err("negative remaining grams must be rejected by the service");
        assert!(err.to_string().to_lowercase().contains("negative"));
    }

    #[tokio::test]
    async fn update_bean_rejects_invalid_data_at_service_layer() {
        let pool = lazy_pool();
        let service = BeanService::new(&pool);
        // Update enforces the same invariants as create, independent of the
        // HTTP handler.
        let err = service
            .update_bean(
                Uuid::new_v4(),
                CreateCoffeeBeanRequest {
                    origin: "".to_string(),
                    ..valid_request()
                },
            )
            .await
            .expect_err("empty origin must be rejected by the service on update");
        assert!(err.to_string().to_lowercase().contains("origin"));
    }
}