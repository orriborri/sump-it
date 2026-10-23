//! Bean service combining features from BeanIt and rustyCoffy
//! Includes inventory management, validation, and comprehensive business logic

use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;
use anyhow::{Result, Context};
use validator::Validate;

use crate::models::{BeanUsageRecord, CoffeeBean, CreateCoffeeBeanRequest};
use crate::pagination::Page;
use crate::validation::{validation_errors_to_string, ValidationErrorType};

/// Why a bean create/update was rejected at the SERVICE layer.
///
/// Mirrors the invariant-owning seam used by `recipe::validate`/`SaveError`
/// (ticket #166): the service command interface is authoritative for bean
/// business rules, so a non-HTTP caller cannot persist an invalid bean by
/// skipping the handler's checks. The API layer still runs the same validation
/// first for fast feedback, so the HTTP responses are unchanged.
#[derive(Debug)]
pub enum BeanServiceError {
    /// The request failed a field or business-rule invariant before any SQL ran.
    Validation(ValidationErrorType),
    /// An underlying database failure.
    Database(anyhow::Error),
}

impl std::fmt::Display for BeanServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BeanServiceError::Validation(e) => write!(f, "{}", e),
            BeanServiceError::Database(e) => write!(f, "{}", e),
        }
    }
}

/// Validates an incoming bean request against BOTH the derive-based field rules
/// (length bounds) and the comprehensive business rules (non-empty name/origin,
/// no future dates, non-negative grams). Shared by create and update so the
/// service owns the invariant regardless of the caller.
fn validate_bean_request(request: &CreateCoffeeBeanRequest) -> Result<(), BeanServiceError> {
    if let Err(errors) = request.validate() {
        return Err(BeanServiceError::Validation(ValidationErrorType::Validation(
            validation_errors_to_string(&errors),
        )));
    }
    request
        .validate_comprehensive()
        .map_err(BeanServiceError::Validation)
}

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
    /// Pagination is normalized once by [`Page`] (ticket #167): the `LIMIT` and
    /// `OFFSET` used here are the SAME normalized values the handler reports as
    /// `page_size`/`has_more`, so the query and the response metadata can never
    /// disagree for out-of-range `page`/`limit` inputs.
    pub async fn list_beans(&self, page: Page) -> Result<(Vec<CoffeeBean>, i64)> {
        let limit = page.limit();
        let offset = page.offset();
        
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
    /// The service is the authoritative seam for bean invariants (ticket #166):
    /// the request is validated HERE before any SQL runs, so a non-HTTP caller
    /// cannot persist an invalid bean. Returns [`BeanServiceError::Validation`]
    /// on a bad request and [`BeanServiceError::Database`] on a SQL failure.
    pub async fn create_bean(
        &self,
        request: CreateCoffeeBeanRequest,
    ) -> Result<CoffeeBean, BeanServiceError> {
        validate_bean_request(&request)?;
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
        .map_err(|e| BeanServiceError::Database(
            anyhow::Error::new(e).context("Failed to create bean"),
        ))?;
        
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
    /// Like [`Self::create_bean`], the request is validated at the service
    /// layer (ticket #166) before any SQL runs. Returns `Ok(None)` when no
    /// active bean with `id` exists.
    pub async fn update_bean(
        &self,
        id: Uuid,
        request: CreateCoffeeBeanRequest,
    ) -> Result<Option<CoffeeBean>, BeanServiceError> {
        validate_bean_request(&request)?;
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
        .map_err(|e| BeanServiceError::Database(
            anyhow::Error::new(e).context("Failed to update bean"),
        ))?;
        
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
    //! Service-layer invariant tests (ticket #166).
    //!
    //! These assert the SERVICE command interface rejects invalid beans
    //! independent of the HTTP handler. `create_bean`/`update_bean` validate
    //! via `validate_bean_request` BEFORE opening any connection, so exercising
    //! that gate proves a non-HTTP caller cannot reach the SQL with an invalid
    //! request. The expected verdicts come from the documented bean rules
    //! (non-empty name/origin, no future dates, non-negative grams, length
    //! bounds), not from the implementation under test.

    use super::*;
    use chrono::{Duration, Utc};

    /// A request that satisfies every documented bean rule.
    fn valid_request() -> CreateCoffeeBeanRequest {
        let today = Utc::now().naive_utc().date();
        CreateCoffeeBeanRequest {
            name: "Ethiopia Yirgacheffe".to_string(),
            origin: "Ethiopia".to_string(),
            roast_date: today,
            purchase_date: today,
            remaining_grams: Some(250.0),
            variety: Some("Heirloom".to_string()),
            processing_method: Some("Washed".to_string()),
        }
    }

    #[test]
    fn accepts_a_fully_valid_request() {
        assert!(validate_bean_request(&valid_request()).is_ok());
    }

    #[test]
    fn rejects_empty_name() {
        let mut req = valid_request();
        req.name = "   ".to_string();
        assert!(matches!(
            validate_bean_request(&req),
            Err(BeanServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_empty_origin() {
        let mut req = valid_request();
        req.origin = String::new();
        assert!(matches!(
            validate_bean_request(&req),
            Err(BeanServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_future_roast_date() {
        let mut req = valid_request();
        req.roast_date = (Utc::now() + Duration::days(1)).naive_utc().date();
        assert!(matches!(
            validate_bean_request(&req),
            Err(BeanServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_negative_remaining_grams() {
        let mut req = valid_request();
        req.remaining_grams = Some(-1.0);
        assert!(matches!(
            validate_bean_request(&req),
            Err(BeanServiceError::Validation(_))
        ));
    }

    #[test]
    fn rejects_name_over_length_bound() {
        // The derive `validate()` enforces the 1..=100 length bound; a
        // 101-character name is rejected before any SQL would run.
        let mut req = valid_request();
        req.name = "x".repeat(101);
        assert!(matches!(
            validate_bean_request(&req),
            Err(BeanServiceError::Validation(_))
        ));
    }
}