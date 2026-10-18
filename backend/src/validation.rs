//! Comprehensive validation combining best practices from all three applications
//! From rustyCoffy: Domain validation with constants
//! From BeanIt: Regex pattern validation for ratios
//! From sump-it: Form field validation patterns

use thiserror::Error;
use validator::ValidationErrors;

// Domain validation constants from rustyCoffy
pub const COFFEE_RATIO_MIN: f32 = 15.0;
pub const COFFEE_RATIO_MAX: f32 = 17.0;
pub const RATING_MIN: f32 = 1.0;
pub const RATING_MAX: f32 = 10.0;
pub const RATING_INCREMENT: f32 = 0.5;
pub const COFFEE_AMOUNT_MIN: f32 = 10.0;
pub const COFFEE_AMOUNT_MAX: f32 = 100.0;
pub const WATER_AMOUNT_MIN: f32 = 150.0;
pub const WATER_AMOUNT_MAX: f32 = 1700.0;
pub const BREW_TIME_MIN: i32 = 30;
pub const BREW_TIME_MAX: i32 = 480;
pub const WATER_TEMP_MIN: i32 = 60;
pub const WATER_TEMP_MAX: i32 = 100;
pub const GRIND_SETTING_MIN: i32 = 0;
pub const GRIND_SETTING_MAX: i32 = 999; // Reasonable maximum

#[derive(Debug, Error)]
pub enum ValidationErrorType {
    #[error("Validation failed: {0}")]
    Validation(String),
    
    #[error("Coffee ratio {ratio:.1} outside acceptable range {min:.1}-{max:.1}")]
    CoffeeRatioInvalid { ratio: f32, min: f32, max: f32 },
    
    #[error("Quality rating must be in 0.5 increments between {min:.1}-{max:.1}, got: {rating}")]
    InvalidQualityRating { rating: f32, min: f32, max: f32 },
    
    #[error("Coffee amount {amount}g outside valid range {min}-{max}g")]
    InvalidCoffeeAmount { amount: f32, min: f32, max: f32 },
    
    #[error("Water amount {amount}ml outside valid range {min}-{max}ml")]
    InvalidWaterAmount { amount: f32, min: f32, max: f32 },
    
    #[error("Brew time {time}s outside valid range {min}-{max}s")]
    InvalidBrewTime { time: i32, min: i32, max: i32 },
    
    #[error("Water temperature {temp}°C outside valid range {min}-{max}°C")]
    InvalidWaterTemperature { temp: i32, min: i32, max: i32 },
    
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
    
    #[error("Insufficient bean quantity: {available}g available, {required}g required")]
    InsufficientBeanQuantity { 
        available: f32, 
        required: f32 
    },
    
    #[error("Bean name cannot be empty")]
    BeanNameEmpty,
    
    #[error("Grinder brand cannot be empty")]
    GrinderBrandEmpty,
}

/// Validates coffee to water ratio (from rustyCoffy)
pub fn validate_coffee_ratio(coffee_grams: f32, water_grams: f32) -> Result<f32, ValidationErrorType> {
    let ratio = water_grams / coffee_grams;
    if ratio < COFFEE_RATIO_MIN || ratio > COFFEE_RATIO_MAX {
        return Err(ValidationErrorType::CoffeeRatioInvalid {
            ratio,
            min: COFFEE_RATIO_MIN,
            max: COFFEE_RATIO_MAX,
        });
    }
    Ok(ratio)
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

/// Validates coffee amount (from rustyCoffy)
pub fn validate_coffee_amount(amount: f32) -> Result<(), ValidationErrorType> {
    if amount < COFFEE_AMOUNT_MIN || amount > COFFEE_AMOUNT_MAX {
        return Err(ValidationErrorType::InvalidCoffeeAmount {
            amount,
            min: COFFEE_AMOUNT_MIN,
            max: COFFEE_AMOUNT_MAX,
        });
    }
    Ok(())
}

/// Validates water amount (from rustyCoffy)
pub fn validate_water_amount(amount: f32) -> Result<(), ValidationErrorType> {
    if amount < WATER_AMOUNT_MIN || amount > WATER_AMOUNT_MAX {
        return Err(ValidationErrorType::InvalidWaterAmount {
            amount,
            min: WATER_AMOUNT_MIN,
            max: WATER_AMOUNT_MAX,
        });
    }
    Ok(())
}

/// Validates brew time (from rustyCoffy)
pub fn validate_brew_time(time: i32) -> Result<(), ValidationErrorType> {
    if time < BREW_TIME_MIN || time > BREW_TIME_MAX {
        return Err(ValidationErrorType::InvalidBrewTime {
            time,
            min: BREW_TIME_MIN,
            max: BREW_TIME_MAX,
        });
    }
    Ok(())
}

/// Validates water temperature (from rustyCoffy)
pub fn validate_water_temperature(temp: i32) -> Result<(), ValidationErrorType> {
    if temp < WATER_TEMP_MIN || temp > WATER_TEMP_MAX {
        return Err(ValidationErrorType::InvalidWaterTemperature {
            temp,
            min: WATER_TEMP_MIN,
            max: WATER_TEMP_MAX,
        });
    }
    Ok(())
}

/// Validates grind setting against grinder range (from rustyCoffy)
pub fn validate_grind_setting(
    setting: i32, 
    min_setting: i32, 
    max_setting: i32, 
    grinder_name: &str
) -> Result<(), ValidationErrorType> {
    if setting < min_setting || setting > max_setting {
        return Err(ValidationErrorType::GrindSettingOutOfRange {
            setting,
            min: min_setting,
            max: max_setting,
            grinder: grinder_name.to_string(),
        });
    }
    Ok(())
}

/// Validates bean quantity sufficiency (from rustyCoffy)
pub fn validate_bean_quantity(
    available: Option<f32>, 
    required: f32
) -> Result<(), ValidationErrorType> {
    if let Some(available) = available {
        if available < required {
            return Err(ValidationErrorType::InsufficientBeanQuantity {
                available,
                required,
            });
        }
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
    fn test_validate_coffee_ratio() {
        // Valid ratios
        assert!(validate_coffee_ratio(20.0, 320.0).is_ok()); // 16:1 ratio
        assert!(validate_coffee_ratio(20.0, 300.0).is_ok()); // 15:1 ratio
        assert!(validate_coffee_ratio(20.0, 340.0).is_ok()); // 17:1 ratio
        
        // Invalid ratios
        assert!(validate_coffee_ratio(20.0, 280.0).is_err()); // 14:1 ratio (too low)
        assert!(validate_coffee_ratio(20.0, 360.0).is_err()); // 18:1 ratio (too high)
    }

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
    fn test_validate_bean_quantity() {
        // Sufficient quantity
        assert!(validate_bean_quantity(Some(50.0), 20.0).is_ok());
        assert!(validate_bean_quantity(Some(20.0), 20.0).is_ok()); // Exactly enough
        
        // Insufficient quantity
        assert!(validate_bean_quantity(Some(10.0), 20.0).is_err());
        
        // No quantity tracking
        assert!(validate_bean_quantity(None, 20.0).is_ok()); // Assume sufficient
    }

    #[test]
    fn test_validate_grind_setting() {
        // Valid settings
        assert!(validate_grind_setting(20, 0, 40, "Comandante C40").is_ok());
        assert!(validate_grind_setting(0, 0, 40, "Comandante C40").is_ok()); // Min
        assert!(validate_grind_setting(40, 0, 40, "Comandante C40").is_ok()); // Max
        
        // Invalid settings
        assert!(validate_grind_setting(-1, 0, 40, "Comandante C40").is_err()); // Below min
        assert!(validate_grind_setting(41, 0, 40, "Comandante C40").is_err()); // Above max
    }

    #[test]
    fn test_validate_coffee_amount() {
        assert!(validate_coffee_amount(COFFEE_AMOUNT_MIN).is_ok());
        assert!(validate_coffee_amount(COFFEE_AMOUNT_MAX).is_ok());
        assert!(validate_coffee_amount(50.0).is_ok());
        assert!(validate_coffee_amount(COFFEE_AMOUNT_MIN - 0.1).is_err());
        assert!(validate_coffee_amount(COFFEE_AMOUNT_MAX + 0.1).is_err());
    }

    #[test]
    fn test_validate_water_amount() {
        assert!(validate_water_amount(WATER_AMOUNT_MIN).is_ok());
        assert!(validate_water_amount(WATER_AMOUNT_MAX).is_ok());
        assert!(validate_water_amount(320.0).is_ok());
        assert!(validate_water_amount(WATER_AMOUNT_MIN - 0.1).is_err());
        assert!(validate_water_amount(WATER_AMOUNT_MAX + 0.1).is_err());
    }

    #[test]
    fn test_validate_brew_time() {
        assert!(validate_brew_time(BREW_TIME_MIN).is_ok());
        assert!(validate_brew_time(BREW_TIME_MAX).is_ok());
        assert!(validate_brew_time(180).is_ok());
        assert!(validate_brew_time(BREW_TIME_MIN - 1).is_err());
        assert!(validate_brew_time(BREW_TIME_MAX + 1).is_err());
    }

    #[test]
    fn test_validate_water_temperature() {
        assert!(validate_water_temperature(WATER_TEMP_MIN).is_ok());
        assert!(validate_water_temperature(WATER_TEMP_MAX).is_ok());
        assert!(validate_water_temperature(93).is_ok());
        assert!(validate_water_temperature(WATER_TEMP_MIN - 1).is_err());
        assert!(validate_water_temperature(WATER_TEMP_MAX + 1).is_err());
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
            ValidationErrorType::CoffeeRatioInvalid { ratio: 18.0, min: COFFEE_RATIO_MIN, max: COFFEE_RATIO_MAX },
            ValidationErrorType::InvalidQualityRating { rating: 5.3, min: RATING_MIN, max: RATING_MAX },
            ValidationErrorType::InvalidCoffeeAmount { amount: 5.0, min: COFFEE_AMOUNT_MIN, max: COFFEE_AMOUNT_MAX },
            ValidationErrorType::InvalidWaterAmount { amount: 10.0, min: WATER_AMOUNT_MIN, max: WATER_AMOUNT_MAX },
            ValidationErrorType::InvalidBrewTime { time: 10, min: BREW_TIME_MIN, max: BREW_TIME_MAX },
            ValidationErrorType::InvalidWaterTemperature { temp: 50, min: WATER_TEMP_MIN, max: WATER_TEMP_MAX },
            ValidationErrorType::GrindSettingOutOfRange { setting: 99, min: 0, max: 40, grinder: "C40".to_string() },
            ValidationErrorType::MethodCoffeeRatioInvalid { method: "Espresso".to_string(), ratio: 10.0, min: 1.5, max: 3.0 },
            ValidationErrorType::MethodCoffeeAmountInvalid { method: "Espresso".to_string(), amount: 5.0, min: 7.0, max: 25.0 },
            ValidationErrorType::MethodWaterAmountInvalid { method: "Espresso".to_string(), amount: 5.0, min: 10.0, max: 75.0 },
            ValidationErrorType::MethodWaterTemperatureInvalid { method: "Espresso".to_string(), temp: 50, min: 88, max: 96 },
            ValidationErrorType::MethodBrewTimeInvalid { method: "Espresso".to_string(), time: 5, min: 15, max: 60 },
            ValidationErrorType::InsufficientBeanQuantity { available: 5.0, required: 20.0 },
            ValidationErrorType::BeanNameEmpty,
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