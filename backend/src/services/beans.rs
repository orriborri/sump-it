//! Bean service combining features from BeanIt and rustyCoffy
//! Includes inventory management, validation, and comprehensive business logic

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use anyhow::{Result, Context};

use crate::models::{BeanUsageRecord, CoffeeBean, CreateCoffeeBeanRequest};
use crate::validation::ValidationErrorType;

/// Why a bean create/update failed. Mirrors `services::sessions::SaveError`:
/// the API layer maps each variant to an HTTP status and an `ErrorResponse`,
/// so `Validation` carries the precise `ValidationErrorType`.
#[derive(Debug)]
pub enum BeanServiceError {
    /// A bean business rule (empty name/origin, future roast/purchase date, or
    /// negative remaining grams) was violated BEFORE any row was written.
    Validation(ValidationErrorType),
    /// Any underlying database failure.
    Database(anyhow::Error),
}

#[cfg(test)]
mod error_tests {
    use super::*;

    #[test]
    fn service_errors_have_actionable_display_messages() {
        let validation = BeanServiceError::Validation(ValidationErrorType::BeanNameEmpty);
        assert_eq!(validation.to_string(), "Bean name cannot be empty");
        let database = BeanServiceError::Database(anyhow::anyhow!("database unavailable"));
        assert_eq!(database.to_string(), "database unavailable");
    }
}

impl std::fmt::Display for BeanServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BeanServiceError::Validation(e) => write!(f, "{e}"),
            BeanServiceError::Database(e) => write!(f, "{e}"),
        }
    }
}

/// Service for managing coffee beans
pub struct BeanService<'a> {
    pool: &'a PgPool,
}

impl<'a> BeanService<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }
    
    /// List all coffee beans with pagination
    pub async fn list_beans(&self, page: Option<i32>, limit: Option<i32>) -> Result<(Vec<CoffeeBean>, i64)> {
        let page = page.unwrap_or(1).max(1);
        let limit = limit.unwrap_or(50).clamp(1, 100);
        let offset = (page - 1) * limit;
        
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
    /// Business-rule validation runs at the TOP of the method, BEFORE any pool
    /// or SQL access, so a non-handler caller cannot persist invalid data. The
    /// handler keeps its own fast-path check for immediate HTTP feedback, but
    /// this service is the authoritative owner of the invariants.
    pub async fn create_bean(
        &self,
        request: CreateCoffeeBeanRequest,
    ) -> std::result::Result<CoffeeBean, BeanServiceError> {
        request
            .validate_comprehensive()
            .map_err(BeanServiceError::Validation)?;

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
        .context("Failed to create bean")
        .map_err(BeanServiceError::Database)?;
        
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
    /// Like [`Self::create_bean`], the business rules are validated at the top
    /// of the method, BEFORE any pool/SQL access, so invalid data fails at the
    /// service layer independent of the HTTP handler.
    pub async fn update_bean(
        &self,
        id: Uuid,
        request: CreateCoffeeBeanRequest,
    ) -> std::result::Result<Option<CoffeeBean>, BeanServiceError> {
        request
            .validate_comprehensive()
            .map_err(BeanServiceError::Validation)?;

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
        .context("Failed to update bean")
        .map_err(BeanServiceError::Database)?;
        
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
