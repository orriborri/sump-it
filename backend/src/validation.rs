//! Comprehensive validation combining best practices from all three applications
//! From rustyCoffy: Domain validation with constants
//! From BeanIt: Regex pattern validation for ratios
//! From sump-it: Form field validation patterns

use std::fmt;
use regex::Regex;
use thiserror::Error;
use validator::{Validate, ValidationError, ValidationErrors};

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
    
    #[error("Insufficient bean quantity: {available}g available, {required}g required")]
    InsufficientBeanQuantity { 
        available: f32, 
        required: f32 
    },
    
    #[error("Invalid coffee/water ratio format. Must be '1:15', '20:300', or '20g:300ml'")]
    InvalidRatioFormat,
    
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

/// Validates coffee/water ratio format (from BeanIt)
pub fn validate_ratio_format(ratio: &str) -> Result<(), ValidationErrorType> {
    if ratio.trim().is_empty() {
        return Err(ValidationErrorType::InvalidRatioFormat);
    }
    
    // Regex patterns from BeanIt
    let ratio_patterns = [
        Regex::new(r"^1:\d+(\.\d+)?$").unwrap(), // 1:15, 1:16.5
        Regex::new(r"^\d+(\.\d+)?:\d+(\.\d+)?$").unwrap(), // 15:250, 20.5:300
        Regex::new(r"^\d+(\.\d+)?g:\d+(\.\d+)?ml$").unwrap(), // 20g:300ml
    ];
    
    if !ratio_patterns.iter().any(|pattern| pattern.is_match(ratio)) {
        return Err(ValidationErrorType::InvalidRatioFormat);
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
            messages.push(format!("{}: {}", field, error.message.as_ref().unwrap_or(&"invalid".to_string())));
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
    fn test_validate_ratio_format() {
        // Valid formats
        assert!(validate_ratio_format("1:15").is_ok());
        assert!(validate_ratio_format("1:16.5").is_ok());
        assert!(validate_ratio_format("20:300").is_ok());
        assert!(validate_ratio_format("20.5:300").is_ok());
        assert!(validate_ratio_format("20g:300ml").is_ok());
        
        // Invalid formats
        assert!(validate_ratio_format("").is_err());
        assert!(validate_ratio_format("1:15:20").is_err()); // Too many colons
        assert!(validate_ratio_format("abc:def").is_err()); // Non-numeric
        assert!(validate_ratio_format("20g300ml").is_err()); // Missing colon
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
}