//! Comprehensive validation combining best practices from all three applications
//! From rustyCoffy: Domain validation with constants
//! From BeanIt: Regex pattern validation for ratios
//! From sump-it: Form field validation patterns

use thiserror::Error;
use validator::ValidationErrors;

// Domain validation constants from rustyCoffy. The per-method brewing ranges
// (coffee/water amounts, temperature, time, ratio) now live in the recipe
// module, which is the single source of truth; only the method-invariant
// quality-rating bounds remain here (used by `validate_rating`).
pub const RATING_MIN: f32 = 1.0;
pub const RATING_MAX: f32 = 10.0;

#[derive(Debug, Error)]
pub enum ValidationErrorType {
    #[error("Validation failed: {0}")]
    Validation(String),
    
    #[error("Quality rating must be in 0.5 increments between {min:.1}-{max:.1}, got: {rating}")]
    InvalidQualityRating { rating: f32, min: f32, max: f32 },

    #[error("Grind setting {setting} outside range {min}-{max} for {grinder}")]
    GrindSettingOutOfRange { 
        setting: i32, 
        min: i32, 
        max: i32, 
        grinder: String 
    },

    #[error("Coffee ratio {ratio:.1} outside range {min:.1}-{max:.1} for {method}")]
    MethodCoffeeRatioInvalid { method: String, ratio: f32, min: f32, max: f32 },

    #[error("Coffee amount {amount}g outside range {min}-{max}g for {method}")]
    MethodCoffeeAmountInvalid { method: String, amount: f32, min: f32, max: f32 },

    #[error("Water amount {amount}g outside range {min}-{max}g for {method}")]
    MethodWaterAmountInvalid { method: String, amount: f32, min: f32, max: f32 },

    #[error("Water temperature {temp}°C outside range {min}-{max}°C for {method}")]
    MethodWaterTemperatureInvalid { method: String, temp: i32, min: i32, max: i32 },

    #[error("Brew time {time}s outside range {min}-{max}s for {method}")]
    MethodBrewTimeInvalid { method: String, time: i32, min: i32, max: i32 },
    
    #[error("Bean name cannot be empty")]
    BeanNameEmpty,

    #[error("Bean origin cannot be empty")]
    BeanOriginEmpty,

    #[error("Roast date cannot be in the future")]
    RoastDateInFuture,

    #[error("Purchase date cannot be in the future")]
    PurchaseDateInFuture,

    #[error("Remaining grams cannot be negative, got: {grams}")]
    NegativeRemainingGrams { grams: f32 },
    
    #[error("Grinder brand cannot be empty")]
    GrinderBrandEmpty,
}

/// Validates quality rating (from rustyCoffy)
pub fn validate_rating(rating: f32) -> Result<(), ValidationErrorType> {
    if rating < RATING_MIN || rating > RATING_MAX {
        return Err(ValidationErrorType::InvalidQualityRating {
            rating,
            min: RATING_MIN,
            max: RATING_MAX,
        });
    }
    
    // Check if rating is in 0.5 increments
    let scaled = rating * 2.0;
    if (scaled - scaled.floor()).abs() > f32::EPSILON {
        return Err(ValidationErrorType::InvalidQualityRating {
            rating,
            min: RATING_MIN,
            max: RATING_MAX,
        });
    }
    
    Ok(())
}

/// Validates bean name (from sump-it patterns)
pub fn validate_bean_name(name: &str) -> Result<(), ValidationErrorType> {
    if name.trim().is_empty() {
        return Err(ValidationErrorType::BeanNameEmpty);
    }
    
    // Additional validation from sump-it patterns
    if name.len() > 100 {
        return Err(ValidationErrorType::Validation(
            "Bean name must be 100 characters or less".to_string()
        ));
    }
    
    Ok(())
}

/// Validates a grinder's setting range: the minimum must be non-negative and
/// the maximum must be strictly greater than the minimum. Mirrors the
/// `CHECK (min_setting >= 0)` and `CHECK (max_setting > min_setting)`
/// constraints in the database schema so the same rule is enforced before a
/// row is ever written. Shared by the API handlers and `Grinder::validate_comprehensive`.
pub fn validate_grinder_setting_range(
    min_setting: i32,
    max_setting: i32,
) -> Result<(), ValidationErrorType> {
    if min_setting < 0 {
        return Err(ValidationErrorType::Validation(
            "Minimum setting must be non-negative".to_string(),
        ));
    }

    if max_setting <= min_setting {
        return Err(ValidationErrorType::Validation(format!(
            "Maximum setting ({}) must be greater than minimum setting ({})",
            max_setting, min_setting
        )));
    }

    Ok(())
}

/// Validates bean origin (non-empty, length-bounded).
///
/// Mirrors [`validate_bean_name`]: origin is a required, human-entered field
/// and an empty or whitespace-only value is a user error that must be named
/// clearly rather than stored.
pub fn validate_bean_origin(origin: &str) -> Result<(), ValidationErrorType> {
    if origin.trim().is_empty() {
        return Err(ValidationErrorType::BeanOriginEmpty);
    }

    if origin.len() > 100 {
        return Err(ValidationErrorType::Validation(
            "Bean origin must be 100 characters or less".to_string(),
        ));
    }

    Ok(())
}

/// Validates an optional remaining-grams quantity.
///
/// Quantity tracking is optional (`None` means "not tracked"), but when a
/// value is present it must be non-negative. A negative quantity is a user
/// error reported with the offending value so the message is actionable.
pub fn validate_remaining_grams(remaining_grams: Option<f32>) -> Result<(), ValidationErrorType> {
    if let Some(grams) = remaining_grams {
        if grams < 0.0 {
            return Err(ValidationErrorType::NegativeRemainingGrams { grams });
        }
    }
    Ok(())
}

/// Validates grinder brand (from sump-it patterns)
pub fn validate_grinder_brand(brand: &str) -> Result<(), ValidationErrorType> {
    if brand.trim().is_empty() {
        return Err(ValidationErrorType::GrinderBrandEmpty);
    }
    
    if brand.len() > 100 {
        return Err(ValidationErrorType::Validation(
            "Grinder brand must be 100 characters or less".to_string()
        ));
    }
    
    Ok(())
}

/// Validation result type for comprehensive validation
pub type ValidationResult<T> = Result<T, ValidationErrors>;

/// Trait for comprehensive validation
pub trait ComprehensiveValidate {
    fn validate_comprehensive(&self) -> ValidationResult<()>;
}

/// Helper to convert validation errors to string
pub fn validation_errors_to_string(errors: &ValidationErrors) -> String {
    let mut messages = Vec::new();

    for (field, field_errors) in errors.field_errors() {
        for error in field_errors {
            let message = error
                .message
                .as_deref()
                .unwrap_or("invalid");
            messages.push(format!("{}: {}", field, message));
        }
    }

    messages.join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_rating() {
        // Valid ratings
        assert!(validate_rating(1.0).is_ok());
        assert!(validate_rating(5.5).is_ok());
        assert!(validate_rating(10.0).is_ok());
        
        // Invalid ratings
        assert!(validate_rating(0.5).is_err()); // Below minimum
        assert!(validate_rating(10.5).is_err()); // Above maximum
        assert!(validate_rating(5.3).is_err()); // Not in 0.5 increments
        assert!(validate_rating(5.7).is_err()); // Not in 0.5 increments
    }

    #[test]
    fn test_validate_bean_name() {
        assert!(validate_bean_name("Ethiopia Yirgacheffe").is_ok());
        assert!(validate_bean_name("   ").is_err()); // Empty after trim
        assert!(validate_bean_name("").is_err());
        assert!(validate_bean_name(&"x".repeat(101)).is_err()); // Too long
        assert!(validate_bean_name(&"x".repeat(100)).is_ok()); // Exactly max
    }

    #[test]
    fn test_validate_grinder_setting_range() {
        // Valid ranges.
        assert!(validate_grinder_setting_range(0, 40).is_ok());
        assert!(validate_grinder_setting_range(5, 6).is_ok());

        // Negative minimum is rejected.
        assert!(validate_grinder_setting_range(-1, 40).is_err());

        // Maximum equal to the minimum is rejected.
        assert!(validate_grinder_setting_range(10, 10).is_err());

        // Maximum below the minimum is rejected.
        assert!(validate_grinder_setting_range(10, 5).is_err());
    }

    #[test]
    fn test_validate_bean_origin() {
        assert!(validate_bean_origin("Ethiopia").is_ok());
        assert!(validate_bean_origin("   ").is_err()); // Empty after trim
        assert!(validate_bean_origin("").is_err());
        assert!(validate_bean_origin(&"x".repeat(101)).is_err()); // Too long
        assert!(validate_bean_origin(&"x".repeat(100)).is_ok()); // Exactly max
    }

    #[test]
    fn test_validate_remaining_grams() {
        // Untracked quantity is always acceptable.
        assert!(validate_remaining_grams(None).is_ok());
        // Non-negative quantities pass, including zero.
        assert!(validate_remaining_grams(Some(0.0)).is_ok());
        assert!(validate_remaining_grams(Some(250.0)).is_ok());
        // Negative quantities are rejected.
        assert!(validate_remaining_grams(Some(-0.1)).is_err());
        assert!(validate_remaining_grams(Some(-50.0)).is_err());
    }

    #[test]
    fn test_validate_grinder_brand() {
        assert!(validate_grinder_brand("Comandante").is_ok());
        assert!(validate_grinder_brand("  ").is_err()); // Empty after trim
        assert!(validate_grinder_brand(&"x".repeat(101)).is_err()); // Too long
        assert!(validate_grinder_brand(&"x".repeat(100)).is_ok()); // Exactly max
    }

    #[test]
    fn test_error_display_messages() {
        // Exercise the Display implementation for every error variant so the
        // error-mapping formatting is covered.
        let errors = vec![
            ValidationErrorType::Validation("boom".to_string()),
            ValidationErrorType::InvalidQualityRating { rating: 5.3, min: RATING_MIN, max: RATING_MAX },
            ValidationErrorType::GrindSettingOutOfRange { setting: 99, min: 0, max: 40, grinder: "C40".to_string() },
            ValidationErrorType::MethodCoffeeRatioInvalid { method: "Espresso".to_string(), ratio: 10.0, min: 1.5, max: 3.0 },
            ValidationErrorType::MethodCoffeeAmountInvalid { method: "Espresso".to_string(), amount: 5.0, min: 7.0, max: 25.0 },
            ValidationErrorType::MethodWaterAmountInvalid { method: "Espresso".to_string(), amount: 5.0, min: 10.0, max: 75.0 },
            ValidationErrorType::MethodWaterTemperatureInvalid { method: "Espresso".to_string(), temp: 50, min: 88, max: 96 },
            ValidationErrorType::MethodBrewTimeInvalid { method: "Espresso".to_string(), time: 5, min: 15, max: 60 },
            ValidationErrorType::BeanNameEmpty,
            ValidationErrorType::BeanOriginEmpty,
            ValidationErrorType::RoastDateInFuture,
            ValidationErrorType::PurchaseDateInFuture,
            ValidationErrorType::NegativeRemainingGrams { grams: -5.0 },
            ValidationErrorType::GrinderBrandEmpty,
        ];
        for err in errors {
            // Formatting must produce a non-empty message for each variant.
            assert!(!err.to_string().is_empty());
        }
    }

    #[test]
    fn test_validation_errors_to_string() {
        use validator::ValidationError;

        // Empty errors collection yields an empty string.
        let empty = ValidationErrors::new();
        assert_eq!(validation_errors_to_string(&empty), "");

        // A field error with a message is rendered as "field: message".
        let mut with_message = ValidationErrors::new();
        let mut msg_err = ValidationError::new("length");
        msg_err.message = Some("too short".into());
        with_message.add("name", msg_err);
        assert_eq!(validation_errors_to_string(&with_message), "name: too short");

        // A field error without a message falls back to "invalid".
        let mut without_message = ValidationErrors::new();
        without_message.add("origin", ValidationError::new("required"));
        assert_eq!(validation_errors_to_string(&without_message), "origin: invalid");
    }
}