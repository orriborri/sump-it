//! Domain models combining best practices from all three applications
//! From BeanIt: Type-safe models with validation and serialization
//! From rustyCoffy: Business logic methods and inventory management
//! From sump-it: UI-friendly field names and structures

use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use validator::Validate;
use uuid::Uuid;

use crate::validation::{
    validate_bean_name, validate_grinder_brand, validate_coffee_amount, 
    validate_water_amount, validate_rating, validate_water_temperature,
    validate_brew_time, validate_grind_setting, validate_ratio_format,
    validate_bean_quantity, ValidationErrorType, COFFEE_RATIO_MIN, COFFEE_RATIO_MAX,
};

/// Coffee bean with inventory tracking (from rustyCoffy + BeanIt)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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
    
    /// Validates bean data comprehensively
    pub fn validate_comprehensive(&self) -> Result<(), ValidationErrorType> {
        validate_bean_name(&self.name)?;
        
        if self.roast_date > Utc::now().naive_utc().date() {
            return Err(ValidationErrorType::Validation(
                "Roast date cannot be in the future".to_string()
            ));
        }
        
        if self.purchase_date > Utc::now().naive_utc().date() {
            return Err(ValidationErrorType::Validation(
                "Purchase date cannot be in the future".to_string()
            ));
        }
        
        Ok(())
    }
}

/// Request for creating a new coffee bean
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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

/// Grinder equipment with setting ranges (from rustyCoffy + BeanIt)
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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

/// Grinder type enum (from rustyCoffy + BeanIt)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
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

/// Brewing method (from BeanIt + sump-it)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
    pub has_more: bool,
}

/// Error response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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