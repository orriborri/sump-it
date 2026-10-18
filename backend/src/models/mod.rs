//! Domain models combining best practices from all three applications
//! From BeanIt: Type-safe models with validation and serialization
//! From rustyCoffy: Business logic methods and inventory management
//! From sump-it: UI-friendly field names and structures

use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use validator::Validate;
use uuid::Uuid;
use ts_rs::TS;

use crate::validation::{
    validate_bean_name, validate_bean_origin, validate_remaining_grams,
    validate_grinder_brand, validate_coffee_amount,
    validate_water_amount, validate_rating, validate_water_temperature,
    validate_brew_time, validate_grind_setting,
    validate_bean_quantity, ValidationErrorType, COFFEE_RATIO_MIN, COFFEE_RATIO_MAX,
};

/// Coffee bean with inventory tracking (from rustyCoffy + BeanIt)
#[derive(Debug, Clone, Serialize, Deserialize, Validate, sqlx::FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CoffeeBean {
    pub id: Uuid,
    
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    
    #[validate(length(min = 1, max = 100))]
    pub origin: String,
    
    pub roast_date: NaiveDate,
    pub purchase_date: NaiveDate,
    pub remaining_grams: Option<f32>,
    pub variety: Option<String>,
    pub processing_method: Option<String>,
    pub is_active: bool,
    
    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl CoffeeBean {
    /// Checks if there are sufficient beans for a brewing session (from rustyCoffy)
    pub fn has_sufficient_quantity(&self, required_grams: f32) -> bool {
        match self.remaining_grams {
            Some(available) => available >= required_grams,
            None => true, // If not tracking quantity, assume sufficient
        }
    }
    
    /// Gets the age of the beans in days since roast date (from rustyCoffy)
    pub fn days_since_roast(&self) -> i64 {
        let today = Utc::now().naive_utc().date();
        (today - self.roast_date).num_days()
    }
    
    /// Checks if beans are still fresh (within 30 days of roast) (from rustyCoffy)
    pub fn is_fresh(&self) -> bool {
        self.days_since_roast() <= 30
    }
    
    /// Updates remaining quantity after use (from rustyCoffy)
    pub fn use_beans(&mut self, grams_used: f32) -> Result<(), ValidationErrorType> {
        if let Some(ref mut remaining) = self.remaining_grams {
            validate_bean_quantity(Some(*remaining), grams_used)?;
            *remaining -= grams_used;
        }
        Ok(())
    }
    
    /// Validates bean data comprehensively.
    ///
    /// Rejects empty name/origin, future roast/purchase dates, and negative
    /// remaining grams, each with a clearly named error. Shared with
    /// [`CreateCoffeeBeanRequest::validate_comprehensive`] via
    /// [`validate_bean_fields`].
    pub fn validate_comprehensive(&self) -> Result<(), ValidationErrorType> {
        validate_bean_fields(
            &self.name,
            &self.origin,
            self.roast_date,
            self.purchase_date,
            self.remaining_grams,
        )
    }
}

/// Validates the user-supplied fields shared by [`CoffeeBean`] and
/// [`CreateCoffeeBeanRequest`].
///
/// This is the single source of truth for bean business rules: non-empty
/// name and origin, no future roast/purchase dates, and non-negative remaining
/// grams. Each failure returns a precise [`ValidationErrorType`] that names the
/// offending field so the API can surface an actionable message.
pub fn validate_bean_fields(
    name: &str,
    origin: &str,
    roast_date: NaiveDate,
    purchase_date: NaiveDate,
    remaining_grams: Option<f32>,
) -> Result<(), ValidationErrorType> {
    validate_bean_name(name)?;
    validate_bean_origin(origin)?;

    let today = Utc::now().naive_utc().date();

    if roast_date > today {
        return Err(ValidationErrorType::RoastDateInFuture);
    }

    if purchase_date > today {
        return Err(ValidationErrorType::PurchaseDateInFuture);
    }

    validate_remaining_grams(remaining_grams)?;

    Ok(())
}

/// Request for creating a new coffee bean
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CreateCoffeeBeanRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    
    #[validate(length(min = 1, max = 100))]
    pub origin: String,
    
    pub roast_date: NaiveDate,
    pub purchase_date: NaiveDate,
    pub remaining_grams: Option<f32>,
    pub variety: Option<String>,
    pub processing_method: Option<String>,
}

impl CreateCoffeeBeanRequest {
    /// Applies the shared bean business rules to an incoming create/update
    /// request before it is persisted: non-empty name/origin, no future
    /// roast/purchase dates, and non-negative remaining grams.
    pub fn validate_comprehensive(&self) -> Result<(), ValidationErrorType> {
        validate_bean_fields(
            &self.name,
            &self.origin,
            self.roast_date,
            self.purchase_date,
            self.remaining_grams,
        )
    }
}

/// Grinder equipment with setting ranges (from rustyCoffy + BeanIt)
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Grinder {
    pub id: Uuid,
    
    #[validate(length(min = 1, max = 100))]
    pub brand: String,
    
    #[validate(length(min = 1, max = 100))]
    pub model: String,
    
    pub grinder_type: GrinderType,
    pub min_setting: i32,
    pub max_setting: i32,
    pub scale_type: Option<String>, // "step" or "sliding" (from BeanIt)
    pub description: Option<String>,
    
    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Grinder {
    /// Gets the full name of the grinder (brand + model) (from rustyCoffy)
    pub fn full_name(&self) -> String {
        format!("{} {}", self.brand, self.model)
    }
    
    /// Validates if a grind setting is within this grinder's range (from rustyCoffy)
    pub fn is_valid_setting(&self, setting: i32) -> bool {
        setting >= self.min_setting && setting <= self.max_setting
    }
    
    /// Gets the range of valid settings for this grinder (from rustyCoffy)
    pub fn setting_range(&self) -> std::ops::RangeInclusive<i32> {
        self.min_setting..=self.max_setting
    }
    
    /// Comprehensive validation
    pub fn validate_comprehensive(&self) -> Result<(), ValidationErrorType> {
        validate_grinder_brand(&self.brand)?;
        
        if self.min_setting < 0 {
            return Err(ValidationErrorType::Validation(
                "Minimum setting must be non-negative".to_string()
            ));
        }
        
        if self.max_setting <= self.min_setting {
            return Err(ValidationErrorType::Validation(
                format!(
                    "Maximum setting ({}) must be greater than minimum setting ({})",
                    self.max_setting, self.min_setting
                )
            ));
        }
        
        Ok(())
    }
}

/// Request for creating a new grinder
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CreateGrinderRequest {
    #[validate(length(min = 1, max = 100))]
    pub brand: String,
    
    #[validate(length(min = 1, max = 100))]
    pub model: String,
    
    pub grinder_type: GrinderType,
    pub min_setting: i32,
    pub max_setting: i32,
    pub scale_type: Option<String>,
    pub description: Option<String>,
}

/// Grinder type enum (from rustyCoffy + BeanIt).
///
/// Variants serialize using their Rust names (e.g. `BurrConical`) to match the
/// `grinder_type` Postgres enum text values defined in the migration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export)]
pub enum GrinderType {
    BurrConical,
    BurrFlat,
    Blade,
    Manual,
    Electric,
}

impl GrinderType {
    pub fn to_string(&self) -> String {
        match self {
            GrinderType::BurrConical => "BurrConical".to_string(),
            GrinderType::BurrFlat => "BurrFlat".to_string(),
            GrinderType::Blade => "Blade".to_string(),
            GrinderType::Manual => "Manual".to_string(),
            GrinderType::Electric => "Electric".to_string(),
        }
    }
    
    pub fn from_string(s: &str) -> Result<Self, ValidationErrorType> {
        match s {
            "BurrConical" => Ok(GrinderType::BurrConical),
            "BurrFlat" => Ok(GrinderType::BurrFlat),
            "Blade" => Ok(GrinderType::Blade),
            "Manual" => Ok(GrinderType::Manual),
            "Electric" => Ok(GrinderType::Electric),
            _ => Err(ValidationErrorType::Validation(
                format!("Invalid grinder type: {}", s)
            )),
        }
    }
}

/// Brewing method (from BeanIt + sump-it).
///
/// Variants serialize using their Rust names (e.g. `V60`, `FrenchPress`) to
/// match the `brewing_method` Postgres enum text values in the migration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export)]
pub enum BrewingMethod {
    V60,
    Chemex,
    FrenchPress,
    AeroPress,
    Espresso,
    Moka,
    ColdBrew,
    Other,
}

impl BrewingMethod {
    pub fn to_string(&self) -> String {
        match self {
            BrewingMethod::V60 => "V60".to_string(),
            BrewingMethod::Chemex => "Chemex".to_string(),
            BrewingMethod::FrenchPress => "FrenchPress".to_string(),
            BrewingMethod::AeroPress => "AeroPress".to_string(),
            BrewingMethod::Espresso => "Espresso".to_string(),
            BrewingMethod::Moka => "Moka".to_string(),
            BrewingMethod::ColdBrew => "ColdBrew".to_string(),
            BrewingMethod::Other => "Other".to_string(),
        }
    }
    
    pub fn from_string(s: &str) -> Result<Self, ValidationErrorType> {
        match s {
            "V60" => Ok(BrewingMethod::V60),
            "Chemex" => Ok(BrewingMethod::Chemex),
            "FrenchPress" => Ok(BrewingMethod::FrenchPress),
            "AeroPress" => Ok(BrewingMethod::AeroPress),
            "Espresso" => Ok(BrewingMethod::Espresso),
            "Moka" => Ok(BrewingMethod::Moka),
            "ColdBrew" => Ok(BrewingMethod::ColdBrew),
            "Other" => Ok(BrewingMethod::Other),
            _ => Err(ValidationErrorType::Validation(
                format!("Invalid brewing method: {}", s)
            )),
        }
    }
}

/// Brewing session - comprehensive tracking (from all three applications)
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BrewingSession {
    pub id: Uuid,
    
    // Equipment selection (from sump-it)
    pub bean_id: Uuid,
    pub grinder_id: Uuid,
    pub brewing_method: BrewingMethod,
    
    // Brewing parameters (from rustyCoffy)
    pub grind_setting: i32,
    pub water_temp_celsius: Option<i32>,
    pub brew_time_seconds: Option<i32>,
    pub coffee_grams: f32,
    pub water_grams: f32,
    
    // Results and feedback (from BeanIt + sump-it)
    pub rating: Option<f32>,
    pub tasting_notes: Option<String>,
    pub feedback: Option<String>,
    pub suggestions: Option<String>,
    pub is_template: bool,
    
    // Calculated field
    pub coffee_ratio: Option<f32>,
    
    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl BrewingSession {
    /// Calculates the coffee to water ratio (from rustyCoffy)
    pub fn calculate_coffee_ratio(&self) -> f32 {
        self.water_grams / self.coffee_grams
    }
    
    /// Checks if this session has a high rating (>= 7.0) (from rustyCoffy)
    pub fn is_high_quality(&self) -> bool {
        self.rating.map_or(false, |r| r >= 7.0)
    }
    
    /// Creates a new brewing session for duplication (from rustyCoffy)
    pub fn to_duplicate_request(&self) -> CreateBrewingSessionRequest {
        CreateBrewingSessionRequest {
            bean_id: self.bean_id,
            grinder_id: self.grinder_id,
            brewing_method: self.brewing_method.clone(),
            grind_setting: self.grind_setting,
            water_temp_celsius: self.water_temp_celsius,
            brew_time_seconds: self.brew_time_seconds,
            coffee_grams: self.coffee_grams,
            water_grams: self.water_grams,
            tasting_notes: None, // Don't copy tasting notes
            rating: None, // Don't copy rating
            feedback: None,
            suggestions: None,
            is_template: self.is_template,
        }
    }
    
    /// Comprehensive validation
    pub fn validate_comprehensive(
        &self,
        grinder: &Grinder,
        bean: &CoffeeBean,
    ) -> Result<(), ValidationErrorType> {
        // Validate coffee amount
        validate_coffee_amount(self.coffee_grams)?;
        
        // Validate water amount
        validate_water_amount(self.water_grams)?;
        
        // Validate coffee to water ratio
        let ratio = self.calculate_coffee_ratio();
        if ratio < COFFEE_RATIO_MIN || ratio > COFFEE_RATIO_MAX {
            return Err(ValidationErrorType::CoffeeRatioInvalid {
                ratio,
                min: COFFEE_RATIO_MIN,
                max: COFFEE_RATIO_MAX,
            });
        }
        
        // Validate grind setting
        validate_grind_setting(
            self.grind_setting,
            grinder.min_setting,
            grinder.max_setting,
            &grinder.full_name(),
        )?;
        
        // Validate bean quantity
        validate_bean_quantity(bean.remaining_grams, self.coffee_grams)?;
        
        // Validate rating if provided
        if let Some(rating) = self.rating {
            validate_rating(rating)?;
        }
        
        // Validate water temperature if provided
        if let Some(water_temp) = self.water_temp_celsius {
            validate_water_temperature(water_temp)?;
        }
        
        // Validate brew time if provided
        if let Some(brew_time) = self.brew_time_seconds {
            validate_brew_time(brew_time)?;
        }
        
        Ok(())
    }
}

/// Request for creating a new brewing session
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CreateBrewingSessionRequest {
    pub bean_id: Uuid,
    pub grinder_id: Uuid,
    pub brewing_method: BrewingMethod,
    
    #[validate(range(min = 0))]
    pub grind_setting: i32,
    
    #[validate(range(min = 60, max = 100))]
    pub water_temp_celsius: Option<i32>,
    
    #[validate(range(min = 30, max = 480))]
    pub brew_time_seconds: Option<i32>,
    
    #[validate(range(min = 10.0, max = 100.0))]
    pub coffee_grams: f32,
    
    #[validate(range(min = 150.0, max = 1700.0))]
    pub water_grams: f32,
    
    pub tasting_notes: Option<String>,
    pub rating: Option<f32>,
    pub feedback: Option<String>,
    pub suggestions: Option<String>,
    pub is_template: bool,
}

/// Brew feedback with detailed ratings (from sump-it)
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BrewFeedback {
    pub id: Uuid,
    pub session_id: Uuid,
    pub grind_notes: Option<String>,
    pub extraction_notes: Option<String>,
    
    #[validate(range(min = 1, max = 5))]
    pub aroma_rating: Option<i32>,
    
    #[validate(range(min = 1, max = 5))]
    pub acidity_rating: Option<i32>,
    
    #[validate(range(min = 1, max = 5))]
    pub body_rating: Option<i32>,
    
    #[validate(range(min = 1, max = 5))]
    pub aftertaste_rating: Option<i32>,
    
    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Filter for brewing sessions (from rustyCoffy)
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SessionFilter {
    pub bean_origin: Option<String>,
    pub roast_date_from: Option<NaiveDate>,
    pub roast_date_to: Option<NaiveDate>,
    pub grinder_type: Option<GrinderType>,
    pub brewing_method: Option<BrewingMethod>,
    pub rating_min: Option<f32>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

impl Default for SessionFilter {
    fn default() -> Self {
        Self {
            bean_origin: None,
            roast_date_from: None,
            roast_date_to: None,
            grinder_type: None,
            brewing_method: None,
            rating_min: None,
            limit: Some(50),
            offset: Some(0),
        }
    }
}

/// Response for paginated results
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
    pub has_more: bool,
}

/// A single usage record for a coffee bean: one brewing session that consumed
/// the bean, flattened for display in the bean's usage history.
///
/// Captures what the inventory UI needs per the spec: when the bean was brewed,
/// how much was used, the resulting rating, and the grinder and method used.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct BeanUsageRecord {
    pub session_id: Uuid,
    pub brew_date: DateTime<Utc>,
    pub grams_used: f32,
    pub rating: Option<f32>,
    pub grinder_used: String,
    pub brewing_method: String,
    pub tasting_notes: Option<String>,
}

/// Error response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct ErrorResponse {
    pub error: String,
    pub details: Option<Vec<String>>,
}

impl ErrorResponse {
    pub fn new(error: String) -> Self {
        Self {
            error,
            details: None,
        }
    }
    
    pub fn with_details(error: String, details: Vec<String>) -> Self {
        Self {
            error,
            details: Some(details),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn sample_bean(remaining: Option<f32>, roast_offset_days: i64) -> CoffeeBean {
        let today = Utc::now().naive_utc().date();
        CoffeeBean {
            id: Uuid::new_v4(),
            name: "Ethiopia Yirgacheffe".to_string(),
            origin: "Ethiopia".to_string(),
            roast_date: today - Duration::days(roast_offset_days),
            purchase_date: today - Duration::days(roast_offset_days),
            remaining_grams: remaining,
            variety: Some("Heirloom".to_string()),
            processing_method: Some("Washed".to_string()),
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_grinder(min: i32, max: i32) -> Grinder {
        Grinder {
            id: Uuid::new_v4(),
            brand: "Comandante".to_string(),
            model: "C40".to_string(),
            grinder_type: GrinderType::BurrConical,
            min_setting: min,
            max_setting: max,
            scale_type: Some("step".to_string()),
            description: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_session(coffee: f32, water: f32) -> BrewingSession {
        BrewingSession {
            id: Uuid::new_v4(),
            bean_id: Uuid::new_v4(),
            grinder_id: Uuid::new_v4(),
            brewing_method: BrewingMethod::V60,
            grind_setting: 20,
            water_temp_celsius: Some(93),
            brew_time_seconds: Some(180),
            coffee_grams: coffee,
            water_grams: water,
            rating: Some(8.0),
            tasting_notes: Some("Floral".to_string()),
            feedback: Some("Great".to_string()),
            suggestions: Some("None".to_string()),
            is_template: false,
            coffee_ratio: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn coffee_bean_has_sufficient_quantity() {
        let tracked = sample_bean(Some(30.0), 1);
        assert!(tracked.has_sufficient_quantity(20.0));
        assert!(tracked.has_sufficient_quantity(30.0));
        assert!(!tracked.has_sufficient_quantity(40.0));

        let untracked = sample_bean(None, 1);
        assert!(untracked.has_sufficient_quantity(1000.0));
    }

    #[test]
    fn coffee_bean_freshness() {
        let fresh = sample_bean(Some(100.0), 10);
        assert_eq!(fresh.days_since_roast(), 10);
        assert!(fresh.is_fresh());

        let stale = sample_bean(Some(100.0), 45);
        assert_eq!(stale.days_since_roast(), 45);
        assert!(!stale.is_fresh());
    }

    #[test]
    fn coffee_bean_use_beans() {
        let mut tracked = sample_bean(Some(30.0), 1);
        tracked.use_beans(20.0).unwrap();
        assert_eq!(tracked.remaining_grams, Some(10.0));

        // Using more than available is rejected and leaves quantity untouched.
        assert!(tracked.use_beans(50.0).is_err());
        assert_eq!(tracked.remaining_grams, Some(10.0));

        // Untracked beans succeed without changing anything.
        let mut untracked = sample_bean(None, 1);
        untracked.use_beans(20.0).unwrap();
        assert_eq!(untracked.remaining_grams, None);
    }

    #[test]
    fn coffee_bean_validate_comprehensive() {
        use crate::validation::ValidationErrorType;

        let valid = sample_bean(Some(100.0), 5);
        assert!(valid.validate_comprehensive().is_ok());

        // Untracked quantity (None) still validates.
        let untracked = sample_bean(None, 5);
        assert!(untracked.validate_comprehensive().is_ok());

        // Zero remaining grams is acceptable (non-negative).
        let empty_bag = sample_bean(Some(0.0), 5);
        assert!(empty_bag.validate_comprehensive().is_ok());

        // Empty name is rejected.
        let mut bad_name = sample_bean(Some(100.0), 5);
        bad_name.name = "   ".to_string();
        assert!(matches!(
            bad_name.validate_comprehensive(),
            Err(ValidationErrorType::BeanNameEmpty)
        ));

        // Empty origin is rejected.
        let mut bad_origin = sample_bean(Some(100.0), 5);
        bad_origin.origin = "  ".to_string();
        assert!(matches!(
            bad_origin.validate_comprehensive(),
            Err(ValidationErrorType::BeanOriginEmpty)
        ));

        // Future roast date is rejected with a named error.
        let mut future_roast = sample_bean(Some(100.0), 5);
        future_roast.roast_date = Utc::now().naive_utc().date() + Duration::days(1);
        assert!(matches!(
            future_roast.validate_comprehensive(),
            Err(ValidationErrorType::RoastDateInFuture)
        ));

        // Future purchase date is rejected with a named error.
        let mut future_purchase = sample_bean(Some(100.0), 5);
        future_purchase.purchase_date = Utc::now().naive_utc().date() + Duration::days(1);
        assert!(matches!(
            future_purchase.validate_comprehensive(),
            Err(ValidationErrorType::PurchaseDateInFuture)
        ));

        // Negative remaining grams is rejected with a named error.
        let mut negative = sample_bean(Some(-1.0), 5);
        negative.remaining_grams = Some(-1.0);
        assert!(matches!(
            negative.validate_comprehensive(),
            Err(ValidationErrorType::NegativeRemainingGrams { .. })
        ));
    }

    #[test]
    fn create_bean_request_validate_comprehensive() {
        use crate::validation::ValidationErrorType;

        let today = Utc::now().naive_utc().date();
        let base = CreateCoffeeBeanRequest {
            name: "Ethiopia Yirgacheffe".to_string(),
            origin: "Ethiopia".to_string(),
            roast_date: today - Duration::days(5),
            purchase_date: today - Duration::days(3),
            remaining_grams: Some(250.0),
            variety: Some("Heirloom".to_string()),
            processing_method: Some("Washed".to_string()),
        };

        // A well-formed request validates.
        assert!(base.validate_comprehensive().is_ok());

        // Empty name rejected.
        let bad_name = CreateCoffeeBeanRequest { name: "  ".to_string(), ..base.clone() };
        assert!(matches!(
            bad_name.validate_comprehensive(),
            Err(ValidationErrorType::BeanNameEmpty)
        ));

        // Empty origin rejected.
        let bad_origin = CreateCoffeeBeanRequest { origin: "".to_string(), ..base.clone() };
        assert!(matches!(
            bad_origin.validate_comprehensive(),
            Err(ValidationErrorType::BeanOriginEmpty)
        ));

        // Future roast date rejected.
        let future_roast = CreateCoffeeBeanRequest {
            roast_date: today + Duration::days(1),
            ..base.clone()
        };
        assert!(matches!(
            future_roast.validate_comprehensive(),
            Err(ValidationErrorType::RoastDateInFuture)
        ));

        // Future purchase date rejected.
        let future_purchase = CreateCoffeeBeanRequest {
            purchase_date: today + Duration::days(1),
            ..base.clone()
        };
        assert!(matches!(
            future_purchase.validate_comprehensive(),
            Err(ValidationErrorType::PurchaseDateInFuture)
        ));

        // Negative remaining grams rejected.
        let negative = CreateCoffeeBeanRequest {
            remaining_grams: Some(-10.0),
            ..base.clone()
        };
        assert!(matches!(
            negative.validate_comprehensive(),
            Err(ValidationErrorType::NegativeRemainingGrams { .. })
        ));

        // Untracked quantity validates.
        let untracked = CreateCoffeeBeanRequest { remaining_grams: None, ..base.clone() };
        assert!(untracked.validate_comprehensive().is_ok());
    }

    #[test]
    fn grinder_helpers() {
        let grinder = sample_grinder(0, 40);
        assert_eq!(grinder.full_name(), "Comandante C40");
        assert!(grinder.is_valid_setting(20));
        assert!(grinder.is_valid_setting(0));
        assert!(grinder.is_valid_setting(40));
        assert!(!grinder.is_valid_setting(-1));
        assert!(!grinder.is_valid_setting(41));
        assert_eq!(grinder.setting_range(), 0..=40);
    }

    #[test]
    fn grinder_validate_comprehensive() {
        let valid = sample_grinder(0, 40);
        assert!(valid.validate_comprehensive().is_ok());

        // Empty brand is rejected.
        let mut bad_brand = sample_grinder(0, 40);
        bad_brand.brand = "  ".to_string();
        assert!(bad_brand.validate_comprehensive().is_err());

        // Negative minimum setting is rejected.
        let negative_min = sample_grinder(-1, 40);
        assert!(negative_min.validate_comprehensive().is_err());

        // Max not greater than min is rejected.
        let inverted = sample_grinder(40, 40);
        assert!(inverted.validate_comprehensive().is_err());
    }

    #[test]
    fn grinder_type_round_trip() {
        let all = [
            (GrinderType::BurrConical, "BurrConical"),
            (GrinderType::BurrFlat, "BurrFlat"),
            (GrinderType::Blade, "Blade"),
            (GrinderType::Manual, "Manual"),
            (GrinderType::Electric, "Electric"),
        ];
        for (variant, text) in all {
            assert_eq!(variant.to_string(), text);
            assert_eq!(GrinderType::from_string(text).unwrap(), variant);
        }
        assert!(GrinderType::from_string("Nonsense").is_err());
    }

    #[test]
    fn brewing_method_round_trip() {
        let all = [
            (BrewingMethod::V60, "V60"),
            (BrewingMethod::Chemex, "Chemex"),
            (BrewingMethod::FrenchPress, "FrenchPress"),
            (BrewingMethod::AeroPress, "AeroPress"),
            (BrewingMethod::Espresso, "Espresso"),
            (BrewingMethod::Moka, "Moka"),
            (BrewingMethod::ColdBrew, "ColdBrew"),
            (BrewingMethod::Other, "Other"),
        ];
        for (variant, text) in all {
            assert_eq!(variant.to_string(), text);
            assert_eq!(BrewingMethod::from_string(text).unwrap(), variant);
        }
        assert!(BrewingMethod::from_string("Nonsense").is_err());
    }

    #[test]
    fn session_calculate_ratio_and_quality() {
        let session = sample_session(20.0, 320.0);
        assert_eq!(session.calculate_coffee_ratio(), 16.0);
        assert!(session.is_high_quality());

        let mut low = sample_session(20.0, 320.0);
        low.rating = Some(5.0);
        assert!(!low.is_high_quality());

        let mut unrated = sample_session(20.0, 320.0);
        unrated.rating = None;
        assert!(!unrated.is_high_quality());
    }

    #[test]
    fn session_to_duplicate_request() {
        let session = sample_session(20.0, 320.0);
        let dup = session.to_duplicate_request();
        assert_eq!(dup.bean_id, session.bean_id);
        assert_eq!(dup.grinder_id, session.grinder_id);
        assert_eq!(dup.brewing_method, session.brewing_method);
        assert_eq!(dup.coffee_grams, session.coffee_grams);
        // Rating and notes are intentionally dropped when duplicating.
        assert!(dup.rating.is_none());
        assert!(dup.tasting_notes.is_none());
        assert!(dup.feedback.is_none());
        assert!(dup.suggestions.is_none());
    }

    #[test]
    fn session_validate_comprehensive() {
        let grinder = sample_grinder(0, 40);
        let bean = sample_bean(Some(100.0), 5);

        let valid = sample_session(20.0, 320.0);
        assert!(valid.validate_comprehensive(&grinder, &bean).is_ok());

        // Coffee amount out of range.
        let bad_coffee = sample_session(5.0, 320.0);
        assert!(bad_coffee.validate_comprehensive(&grinder, &bean).is_err());

        // Water amount out of range.
        let bad_water = sample_session(20.0, 100.0);
        assert!(bad_water.validate_comprehensive(&grinder, &bean).is_err());

        // Ratio out of range (valid amounts but ratio below the accepted band).
        let bad_ratio = sample_session(50.0, 320.0);
        assert!(bad_ratio.validate_comprehensive(&grinder, &bean).is_err());

        // Grind setting out of the grinder's range.
        let mut bad_grind = sample_session(20.0, 320.0);
        bad_grind.grind_setting = 999;
        assert!(bad_grind.validate_comprehensive(&grinder, &bean).is_err());

        // Insufficient bean quantity.
        let low_bean = sample_bean(Some(5.0), 5);
        assert!(valid.validate_comprehensive(&grinder, &low_bean).is_err());

        // Invalid rating.
        let mut bad_rating = sample_session(20.0, 320.0);
        bad_rating.rating = Some(5.3);
        assert!(bad_rating.validate_comprehensive(&grinder, &bean).is_err());

        // Invalid water temperature.
        let mut bad_temp = sample_session(20.0, 320.0);
        bad_temp.water_temp_celsius = Some(10);
        assert!(bad_temp.validate_comprehensive(&grinder, &bean).is_err());

        // Invalid brew time.
        let mut bad_time = sample_session(20.0, 320.0);
        bad_time.brew_time_seconds = Some(5);
        assert!(bad_time.validate_comprehensive(&grinder, &bean).is_err());

        // Optional fields absent still validate.
        let mut no_optionals = sample_session(20.0, 320.0);
        no_optionals.rating = None;
        no_optionals.water_temp_celsius = None;
        no_optionals.brew_time_seconds = None;
        assert!(no_optionals.validate_comprehensive(&grinder, &bean).is_ok());
    }

    #[test]
    fn session_filter_default() {
        let filter = SessionFilter::default();
        assert_eq!(filter.limit, Some(50));
        assert_eq!(filter.offset, Some(0));
        assert!(filter.bean_origin.is_none());
        assert!(filter.roast_date_from.is_none());
        assert!(filter.roast_date_to.is_none());
        assert!(filter.grinder_type.is_none());
        assert!(filter.brewing_method.is_none());
        assert!(filter.rating_min.is_none());
    }

    #[test]
    fn error_response_constructors() {
        let simple = ErrorResponse::new("boom".to_string());
        assert_eq!(simple.error, "boom");
        assert!(simple.details.is_none());

        let detailed = ErrorResponse::with_details(
            "bad".to_string(),
            vec!["field: invalid".to_string()],
        );
        assert_eq!(detailed.error, "bad");
        assert_eq!(detailed.details.unwrap().len(), 1);
    }
}