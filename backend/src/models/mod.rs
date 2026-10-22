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
    validate_grinder_brand, validate_grinder_setting_range, ValidationErrorType,
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
#[derive(Debug, Clone, Serialize, Deserialize, Validate, sqlx::FromRow, TS)]
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
    
    /// Comprehensive validation
    pub fn validate_comprehensive(&self) -> Result<(), ValidationErrorType> {
        validate_grinder_brand(&self.brand)?;
        validate_grinder_setting_range(self.min_setting, self.max_setting)?;
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

impl CreateGrinderRequest {
    /// Applies the shared grinder business rules to an incoming create/update
    /// request before it is persisted: non-empty brand and a valid setting
    /// range (`min_setting >= 0`, `max_setting > min_setting`). Mirrors
    /// [`Grinder::validate_comprehensive`] and reuses the same
    /// [`crate::validation`] helpers so the rule has a single source of truth.
    pub fn validate_comprehensive(&self) -> Result<(), ValidationErrorType> {
        validate_grinder_brand(&self.brand)?;
        validate_grinder_setting_range(self.min_setting, self.max_setting)?;
        Ok(())
    }
}

/// Grinder type enum (from rustyCoffy + BeanIt).
///
/// Variants serialize using their Rust names (e.g. `BurrConical`) to match the
/// `grinder_type` Postgres enum text values defined in the migration.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, TS)]
#[sqlx(type_name = "grinder_type")]
#[ts(export)]
pub enum GrinderType {
    BurrConical,
    BurrFlat,
    Blade,
    Manual,
    Electric,
}

impl std::fmt::Display for GrinderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let name = match self {
            GrinderType::BurrConical => "BurrConical",
            GrinderType::BurrFlat => "BurrFlat",
            GrinderType::Blade => "Blade",
            GrinderType::Manual => "Manual",
            GrinderType::Electric => "Electric",
        };
        f.write_str(name)
    }
}

impl GrinderType {
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, TS)]
#[sqlx(type_name = "brewing_method")]
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

impl std::fmt::Display for BrewingMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let name = match self {
            BrewingMethod::V60 => "V60",
            BrewingMethod::Chemex => "Chemex",
            BrewingMethod::FrenchPress => "FrenchPress",
            BrewingMethod::AeroPress => "AeroPress",
            BrewingMethod::Espresso => "Espresso",
            BrewingMethod::Moka => "Moka",
            BrewingMethod::ColdBrew => "ColdBrew",
            BrewingMethod::Other => "Other",
        };
        f.write_str(name)
    }
}

impl BrewingMethod {
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
#[derive(Debug, Clone, Serialize, Deserialize, Validate, sqlx::FromRow, TS)]
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
    /// Builds the request that duplicates this session (ticket #146).
    ///
    /// A duplicate re-brews the SAME recipe, so only the brewing PARAMETERS are
    /// carried over (bean, grinder, method, grind setting, coffee/water grams,
    /// temperature, time). The subjective RESULTS of the original brew are
    /// explicitly dropped so the copy starts clean: `rating`, `tasting_notes`,
    /// `feedback` and `suggestions` are set to `None`, and `is_template` is
    /// reset to `false` (a duplicate is a fresh brew to be logged and rated,
    /// not a template).
    ///
    /// This is a pure field mapping with no I/O, so it lives in the library and
    /// is unit tested to completion. The returned request is fed through the
    /// exact same `recipe::validate` + transactional inventory path as a brand
    /// new brew (see `SessionService::duplicate`), so duplicating also
    /// decrements the bean inventory and can fail on insufficient quantity.
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
            // Results are NOT copied: a duplicate is a fresh brew.
            tasting_notes: None,
            rating: None,
            feedback: None,
            suggestions: None,
            // A duplicate is a concrete brew to log, never a template.
            is_template: false,
        }
    }
}

/// Request for creating a new brewing session.
///
/// The old global `#[validate(range)]` bounds (coffee 10 to 100 g, water 150
/// to 1700 g, temperature 60 to 100 C, brew time 30 to 480 s) were REMOVED in
/// ticket #145: they conflicted with the per-method recipes introduced by
/// ticket #144 and silently rejected legal Espresso, Moka and Cold Brew
/// recipes before they could ever reach [`crate::recipe::validate`]. The
/// per-method recipe table is now the single source of truth for every
/// amount/temperature/time rule, so the only request-level bound kept is the
/// physical invariant `grind_setting >= 0` (grind settings are never negative,
/// independent of method). All other values are checked, per method and
/// against the selected grinder, inside [`crate::recipe::validate`].
#[derive(Debug, Clone, Serialize, Deserialize, Validate, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct CreateBrewingSessionRequest {
    pub bean_id: Uuid,
    pub grinder_id: Uuid,
    pub brewing_method: BrewingMethod,

    // A grind setting is a physical dial position and is never negative,
    // regardless of method; the method-specific upper bound is the selected
    // grinder's `max_setting`, enforced in `recipe::validate`.
    #[validate(range(min = 0))]
    pub grind_setting: i32,

    // No global range: Espresso wants ~90 °C while Cold Brew wants ~20 °C, so
    // the accepted temperature band is per method (recipe table).
    pub water_temp_celsius: Option<i32>,

    // No global range: Cold Brew steeps for hours while Espresso pulls in
    // seconds, so the accepted time band is per method (recipe table).
    pub brew_time_seconds: Option<i32>,

    // No global range: Espresso doses ~18 g while Cold Brew doses 100 g+, so
    // the accepted dose band is per method (recipe table).
    pub coffee_grams: f32,

    // No global range: Espresso uses ~36 g of water while a large Cold Brew
    // uses 800 g+, so the accepted water band is per method (recipe table).
    pub water_grams: f32,

    pub tasting_notes: Option<String>,
    pub rating: Option<f32>,
    pub feedback: Option<String>,
    pub suggestions: Option<String>,
    pub is_template: bool,
}

impl CreateBrewingSessionRequest {
    /// Builds the pure [`crate::recipe::BrewParams`] this request proposes, so
    /// the save path can route through [`crate::recipe::validate`] (the single
    /// source of truth for per-method rules) instead of the superseded global
    /// `validate_comprehensive` / `validate_coffee_ratio` checks.
    ///
    /// This is a pure field mapping with no I/O, so it lives in the library and
    /// is unit tested to completion. `tasting_notes`, `feedback` and
    /// `suggestions` are intentionally NOT part of `BrewParams` (the recipe
    /// module stays free of free-text fields); they are applied to the built
    /// session separately via [`apply_notes_to_session`].
    pub fn to_brew_params(&self) -> crate::recipe::BrewParams {
        crate::recipe::BrewParams {
            bean_id: self.bean_id,
            grinder_id: self.grinder_id,
            brewing_method: self.brewing_method.clone(),
            grind_setting: self.grind_setting,
            coffee_grams: self.coffee_grams,
            water_grams: self.water_grams,
            water_temp_celsius: self.water_temp_celsius,
            brew_time_seconds: self.brew_time_seconds,
            rating: self.rating,
        }
    }
}

/// Copies the free-text and template fields the recipe module deliberately
/// does not carry (`tasting_notes`, `feedback`, `suggestions`, `is_template`)
/// from the originating request onto a session built by
/// [`crate::recipe::ValidatedBrewParams::into_session`].
///
/// Keeping this as a small pure function (rather than widening `BrewParams`)
/// lets the recipe module stay focused on numeric brewing rules while ticket
/// #145 still persists the notes the UI collects. Returns the mutated session
/// so callers can chain it in one expression.
pub fn apply_notes_to_session(
    mut session: BrewingSession,
    request: &CreateBrewingSessionRequest,
) -> BrewingSession {
    session.tasting_notes = request.tasting_notes.clone();
    session.feedback = request.feedback.clone();
    session.suggestions = request.suggestions.clone();
    session.is_template = request.is_template;
    session
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
    fn session_to_duplicate_request() {
        // Start from a template session with a rating and full notes so the
        // drop-behaviour is actually exercised.
        let mut session = sample_session(20.0, 320.0);
        session.is_template = true;
        let dup = session.to_duplicate_request();

        // Every brewing PARAMETER is carried over verbatim.
        assert_eq!(dup.bean_id, session.bean_id);
        assert_eq!(dup.grinder_id, session.grinder_id);
        assert_eq!(dup.brewing_method, session.brewing_method);
        assert_eq!(dup.grind_setting, session.grind_setting);
        assert_eq!(dup.water_temp_celsius, session.water_temp_celsius);
        assert_eq!(dup.brew_time_seconds, session.brew_time_seconds);
        assert_eq!(dup.coffee_grams, session.coffee_grams);
        assert_eq!(dup.water_grams, session.water_grams);

        // The subjective RESULTS are intentionally dropped when duplicating.
        assert!(dup.rating.is_none());
        assert!(dup.tasting_notes.is_none());
        assert!(dup.feedback.is_none());
        assert!(dup.suggestions.is_none());
        // A duplicate is a fresh brew, never a template, even if the original
        // was one.
        assert!(!dup.is_template);
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

    fn sample_create_request() -> CreateBrewingSessionRequest {
        CreateBrewingSessionRequest {
            bean_id: Uuid::new_v4(),
            grinder_id: Uuid::new_v4(),
            brewing_method: BrewingMethod::Espresso,
            grind_setting: 12,
            water_temp_celsius: Some(93),
            brew_time_seconds: Some(30),
            coffee_grams: 18.0,
            water_grams: 36.0,
            tasting_notes: Some("Syrupy, chocolate".to_string()),
            rating: Some(8.5),
            feedback: Some("Even extraction".to_string()),
            suggestions: Some("Grind one step finer".to_string()),
            is_template: true,
        }
    }

    #[test]
    fn create_request_to_brew_params_maps_every_field() {
        let request = sample_create_request();
        let params = request.to_brew_params();

        // Numeric/equipment fields map one-to-one.
        assert_eq!(params.bean_id, request.bean_id);
        assert_eq!(params.grinder_id, request.grinder_id);
        assert_eq!(params.brewing_method, BrewingMethod::Espresso);
        assert_eq!(params.grind_setting, 12);
        assert_eq!(params.coffee_grams, 18.0);
        assert_eq!(params.water_grams, 36.0);
        assert_eq!(params.water_temp_celsius, Some(93));
        assert_eq!(params.brew_time_seconds, Some(30));
        assert_eq!(params.rating, Some(8.5));
    }

    #[test]
    fn create_request_to_brew_params_preserves_absent_optionals() {
        // Absent optional temp/time/rating map straight through as None so the
        // recipe module skips those checks.
        let request = CreateBrewingSessionRequest {
            water_temp_celsius: None,
            brew_time_seconds: None,
            rating: None,
            ..sample_create_request()
        };
        let params = request.to_brew_params();
        assert!(params.water_temp_celsius.is_none());
        assert!(params.brew_time_seconds.is_none());
        assert!(params.rating.is_none());
    }

    #[test]
    fn apply_notes_copies_free_text_and_template_flag() {
        let request = sample_create_request();
        // A fresh session from into_session has no notes and is_template=false.
        let base = sample_session(18.0, 36.0);
        let base = BrewingSession {
            tasting_notes: None,
            feedback: None,
            suggestions: None,
            is_template: false,
            ..base
        };

        let enriched = apply_notes_to_session(base, &request);
        assert_eq!(enriched.tasting_notes.as_deref(), Some("Syrupy, chocolate"));
        assert_eq!(enriched.feedback.as_deref(), Some("Even extraction"));
        assert_eq!(enriched.suggestions.as_deref(), Some("Grind one step finer"));
        assert!(enriched.is_template);
    }

    #[test]
    fn apply_notes_handles_absent_free_text() {
        // When the request omits notes, the session's fields become None and
        // the template flag follows the request (here false).
        let request = CreateBrewingSessionRequest {
            tasting_notes: None,
            feedback: None,
            suggestions: None,
            is_template: false,
            ..sample_create_request()
        };
        let base = sample_session(18.0, 36.0); // starts with Some(..) notes
        let enriched = apply_notes_to_session(base, &request);
        assert!(enriched.tasting_notes.is_none());
        assert!(enriched.feedback.is_none());
        assert!(enriched.suggestions.is_none());
        assert!(!enriched.is_template);
    }
}