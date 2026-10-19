//! Brew recipe rules: the single, pure, in-process place where per-method
//! brewing constraints live.
//!
//! Spec #138 established that recipe rules must be keyed by [`BrewingMethod`]
//! and take the grinder's setting range into account. The old GLOBAL coffee
//! ratio band (15–17) and 150 g water minimum made Espresso (~1:2), Moka and
//! Cold Brew impossible to log; those method-specific rules now live here.
//!
//! The database keeps only method-invariant checks; every per-method rule is
//! expressed in exactly one place: the [`rules_for`] table. Changing a method's
//! accepted range is a one-line edit there.
//!
//! The module makes illegal states hard to represent: a [`ValidatedBrewParams`]
//! can only be produced by [`validate`], so any value of that type is
//! guaranteed to satisfy the rules for its method, and a [`crate::models::BrewingSession`]
//! can be built from it with [`ValidatedBrewParams::into_session`].

use uuid::Uuid;

use crate::models::{BrewingMethod, BrewingSession, Grinder};
use crate::validation::{validate_rating, ValidationErrorType};

/// Inclusive range for a single floating-point brewing parameter.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FloatRange {
    pub min: f32,
    pub max: f32,
}

impl FloatRange {
    const fn new(min: f32, max: f32) -> Self {
        Self { min, max }
    }

    fn contains(&self, value: f32) -> bool {
        value >= self.min && value <= self.max
    }
}

/// Inclusive range for a single integer brewing parameter.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct IntRange {
    pub min: i32,
    pub max: i32,
}

impl IntRange {
    const fn new(min: i32, max: i32) -> Self {
        Self { min, max }
    }

    fn contains(&self, value: i32) -> bool {
        value >= self.min && value <= self.max
    }
}

/// The complete, per-method recipe rule set.
///
/// All ranges are inclusive. `ratio` is water:coffee (e.g. Espresso ~1:2 means
/// a ratio near `2.0`). This is the single source of truth for method rules.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MethodRules {
    /// Water:coffee ratio band.
    pub ratio: FloatRange,
    /// Accepted coffee dose in grams.
    pub coffee_grams: FloatRange,
    /// Accepted water weight in grams.
    pub water_grams: FloatRange,
    /// Accepted water temperature in Celsius.
    pub water_temp_celsius: IntRange,
    /// Accepted brew time in seconds.
    pub brew_time_seconds: IntRange,
}

/// Returns the recipe rules for a brewing method.
///
/// This is THE table. Every per-method constant is defined here and nowhere
/// else; adjusting a method is a one-line change to its row.
pub fn rules_for(method: &BrewingMethod) -> MethodRules {
    match method {
        // Espresso: tight ~1:1.5–1:3, small doses, near-boiling, short shots.
        BrewingMethod::Espresso => MethodRules {
            ratio: FloatRange::new(1.5, 3.0),
            coffee_grams: FloatRange::new(7.0, 25.0),
            water_grams: FloatRange::new(10.0, 75.0),
            water_temp_celsius: IntRange::new(88, 96),
            brew_time_seconds: IntRange::new(15, 60),
        },
        // Moka pot: strong 1:6–1:10, stovetop, near-boiling.
        BrewingMethod::Moka => MethodRules {
            ratio: FloatRange::new(6.0, 10.0),
            coffee_grams: FloatRange::new(10.0, 30.0),
            water_grams: FloatRange::new(60.0, 300.0),
            water_temp_celsius: IntRange::new(90, 100),
            brew_time_seconds: IntRange::new(60, 300),
        },
        // AeroPress: flexible 1:6–1:18 depending on style.
        BrewingMethod::AeroPress => MethodRules {
            ratio: FloatRange::new(6.0, 18.0),
            coffee_grams: FloatRange::new(10.0, 20.0),
            water_grams: FloatRange::new(60.0, 360.0),
            water_temp_celsius: IntRange::new(70, 100),
            brew_time_seconds: IntRange::new(30, 240),
        },
        // French press: 1:12–1:17 immersion.
        BrewingMethod::FrenchPress => MethodRules {
            ratio: FloatRange::new(12.0, 17.0),
            coffee_grams: FloatRange::new(15.0, 60.0),
            water_grams: FloatRange::new(180.0, 1020.0),
            water_temp_celsius: IntRange::new(88, 100),
            brew_time_seconds: IntRange::new(120, 480),
        },
        // Pour-over cones share the classic 1:14–1:18 band.
        BrewingMethod::V60 | BrewingMethod::Chemex => MethodRules {
            ratio: FloatRange::new(14.0, 18.0),
            coffee_grams: FloatRange::new(10.0, 60.0),
            water_grams: FloatRange::new(140.0, 1080.0),
            water_temp_celsius: IntRange::new(88, 100),
            brew_time_seconds: IntRange::new(120, 360),
        },
        // Cold brew: 1:4–1:12 concentrate, cold water, many hours.
        BrewingMethod::ColdBrew => MethodRules {
            ratio: FloatRange::new(4.0, 12.0),
            coffee_grams: FloatRange::new(30.0, 200.0),
            water_grams: FloatRange::new(120.0, 2400.0),
            water_temp_celsius: IntRange::new(15, 30),
            brew_time_seconds: IntRange::new(28_800, 86_400),
        },
        // Other: permissive catch-all so unusual methods remain loggable.
        BrewingMethod::Other => MethodRules {
            ratio: FloatRange::new(1.0, 20.0),
            coffee_grams: FloatRange::new(5.0, 300.0),
            water_grams: FloatRange::new(5.0, 3000.0),
            water_temp_celsius: IntRange::new(1, 100),
            brew_time_seconds: IntRange::new(1, 86_400),
        },
    }
}

/// Unvalidated brewing parameters as proposed by a caller (stepper, API, test).
///
/// Optional temperature and time mirror the domain model: they are only checked
/// against the method's range when present.
#[derive(Debug, Clone)]
pub struct BrewParams {
    pub bean_id: Uuid,
    pub grinder_id: Uuid,
    pub brewing_method: BrewingMethod,
    pub grind_setting: i32,
    pub coffee_grams: f32,
    pub water_grams: f32,
    pub water_temp_celsius: Option<i32>,
    pub brew_time_seconds: Option<i32>,
    pub rating: Option<f32>,
}

/// Brewing parameters that have passed every recipe rule for their method.
///
/// The inner fields are private, so the only way to obtain this type is through
/// [`validate`]. Holding a `ValidatedBrewParams` is therefore proof that the
/// parameters are valid for `brewing_method`, including the grinder range.
#[derive(Debug, Clone)]
pub struct ValidatedBrewParams {
    params: BrewParams,
    coffee_ratio: f32,
}

impl ValidatedBrewParams {
    /// The validated water:coffee ratio.
    pub fn coffee_ratio(&self) -> f32 {
        self.coffee_ratio
    }

    /// The method these parameters were validated for.
    pub fn brewing_method(&self) -> &BrewingMethod {
        &self.params.brewing_method
    }

    /// Borrow the underlying parameters (read-only).
    pub fn params(&self) -> &BrewParams {
        &self.params
    }

    /// Builds a persistable [`BrewingSession`] from validated parameters.
    ///
    /// Because a `ValidatedBrewParams` can only come from [`validate`], the
    /// resulting session is guaranteed to satisfy its method's recipe rules.
    pub fn into_session(self, id: Uuid, created_at: chrono::DateTime<chrono::Utc>) -> BrewingSession {
        let p = self.params;
        BrewingSession {
            id,
            bean_id: p.bean_id,
            grinder_id: p.grinder_id,
            brewing_method: p.brewing_method,
            grind_setting: p.grind_setting,
            water_temp_celsius: p.water_temp_celsius,
            brew_time_seconds: p.brew_time_seconds,
            coffee_grams: p.coffee_grams,
            water_grams: p.water_grams,
            rating: p.rating,
            tasting_notes: None,
            feedback: None,
            suggestions: None,
            is_template: false,
            coffee_ratio: Some(self.coffee_ratio),
            created_at,
            updated_at: created_at,
        }
    }
}

/// Validates `params` against the recipe rules for its method and the grinder's
/// setting range.
///
/// On success returns [`ValidatedBrewParams`], the only constructor for that
/// type. On failure returns a precise [`ValidationErrorType`] naming the field,
/// the offending value, and the allowed range for that method (or grinder).
///
/// Checks run in a fixed order: grind setting (against the grinder), coffee
/// amount, water amount, ratio, optional temperature, optional time, optional
/// rating (the rating rule stays global: 1.0–10.0 in 0.5 steps).
pub fn validate(
    params: BrewParams,
    grinder: &Grinder,
) -> Result<ValidatedBrewParams, ValidationErrorType> {
    let method_name = params.brewing_method.to_string();
    let rules = rules_for(&params.brewing_method);

    // Grind setting must fall within THIS grinder's physical range.
    if !grinder.is_valid_setting(params.grind_setting) {
        return Err(ValidationErrorType::GrindSettingOutOfRange {
            setting: params.grind_setting,
            min: grinder.min_setting,
            max: grinder.max_setting,
            grinder: grinder.full_name(),
        });
    }

    // Coffee dose.
    if !rules.coffee_grams.contains(params.coffee_grams) {
        return Err(ValidationErrorType::MethodCoffeeAmountInvalid {
            method: method_name,
            amount: params.coffee_grams,
            min: rules.coffee_grams.min,
            max: rules.coffee_grams.max,
        });
    }

    // Water weight.
    if !rules.water_grams.contains(params.water_grams) {
        return Err(ValidationErrorType::MethodWaterAmountInvalid {
            method: method_name,
            amount: params.water_grams,
            min: rules.water_grams.min,
            max: rules.water_grams.max,
        });
    }

    // Water:coffee ratio for this method.
    let coffee_ratio = params.water_grams / params.coffee_grams;
    if !rules.ratio.contains(coffee_ratio) {
        return Err(ValidationErrorType::MethodCoffeeRatioInvalid {
            method: method_name,
            ratio: coffee_ratio,
            min: rules.ratio.min,
            max: rules.ratio.max,
        });
    }

    // Optional water temperature.
    if let Some(temp) = params.water_temp_celsius {
        if !rules.water_temp_celsius.contains(temp) {
            return Err(ValidationErrorType::MethodWaterTemperatureInvalid {
                method: method_name,
                temp,
                min: rules.water_temp_celsius.min,
                max: rules.water_temp_celsius.max,
            });
        }
    }

    // Optional brew time.
    if let Some(time) = params.brew_time_seconds {
        if !rules.brew_time_seconds.contains(time) {
            return Err(ValidationErrorType::MethodBrewTimeInvalid {
                method: method_name,
                time,
                min: rules.brew_time_seconds.min,
                max: rules.brew_time_seconds.max,
            });
        }
    }

    // Rating rule stays global: 1.0–10.0 in 0.5 steps.
    if let Some(rating) = params.rating {
        validate_rating(rating)?;
    }

    Ok(ValidatedBrewParams {
        params,
        coffee_ratio,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::GrinderType;
    use chrono::Utc;

    fn grinder(min: i32, max: i32) -> Grinder {
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

    /// Builds parameters that are valid for `method`, so individual tests can
    /// override exactly one field to probe a single boundary.
    fn valid_params(method: BrewingMethod, coffee: f32, water: f32) -> BrewParams {
        let rules = rules_for(&method);
        BrewParams {
            bean_id: Uuid::new_v4(),
            grinder_id: Uuid::new_v4(),
            brewing_method: method,
            grind_setting: 20,
            coffee_grams: coffee,
            water_grams: water,
            // Midpoints of the method's optional ranges keep them in-band.
            water_temp_celsius: Some((rules.water_temp_celsius.min + rules.water_temp_celsius.max) / 2),
            brew_time_seconds: Some((rules.brew_time_seconds.min + rules.brew_time_seconds.max) / 2),
            rating: Some(8.0),
        }
    }

    // A representative in-band (coffee, water) pair for every method, chosen so
    // the ratio sits inside the method's band.
    fn in_band_amounts(method: &BrewingMethod) -> (f32, f32) {
        match method {
            BrewingMethod::Espresso => (18.0, 36.0),   // 1:2
            BrewingMethod::Moka => (20.0, 160.0),      // 1:8
            BrewingMethod::AeroPress => (15.0, 180.0), // 1:12
            BrewingMethod::FrenchPress => (30.0, 450.0), // 1:15
            BrewingMethod::V60 => (20.0, 320.0),       // 1:16
            BrewingMethod::Chemex => (20.0, 320.0),    // 1:16
            BrewingMethod::ColdBrew => (100.0, 800.0), // 1:8
            BrewingMethod::Other => (20.0, 200.0),     // 1:10
        }
    }

    fn all_methods() -> Vec<BrewingMethod> {
        vec![
            BrewingMethod::V60,
            BrewingMethod::Chemex,
            BrewingMethod::FrenchPress,
            BrewingMethod::AeroPress,
            BrewingMethod::Espresso,
            BrewingMethod::Moka,
            BrewingMethod::ColdBrew,
            BrewingMethod::Other,
        ]
    }

    #[test]
    fn every_method_accepts_a_valid_recipe() {
        let g = grinder(0, 40);
        for method in all_methods() {
            let (coffee, water) = in_band_amounts(&method);
            let params = valid_params(method.clone(), coffee, water);
            let result = validate(params, &g);
            assert!(result.is_ok(), "expected {:?} recipe to validate", method);
            let validated = result.unwrap();
            assert_eq!(validated.brewing_method(), &method);
            // Ratio is reported and lies within the method band.
            let rules = rules_for(&method);
            assert!(rules.ratio.contains(validated.coffee_ratio()));
        }
    }

    #[test]
    fn spec_difficult_methods_are_accepted() {
        // These are the three the old global rules made impossible to log.
        let g = grinder(0, 40);
        // Espresso ~1:2.
        assert!(validate(valid_params(BrewingMethod::Espresso, 18.0, 36.0), &g).is_ok());
        // Moka ~1:8.
        assert!(validate(valid_params(BrewingMethod::Moka, 18.0, 144.0), &g).is_ok());
        // Cold brew ~1:8 with a large batch.
        assert!(validate(valid_params(BrewingMethod::ColdBrew, 100.0, 800.0), &g).is_ok());
    }

    // Picks a coffee dose for which both the lower and upper ratio bounds map
    // to a water weight that stays inside the method's water-amount range, so a
    // ratio-boundary probe isolates the ratio check (never trips water-amount).
    fn ratio_safe_coffee(rules: &MethodRules) -> f32 {
        // Highest coffee whose max-ratio water fits under the water ceiling.
        let hi = rules.water_grams.max / rules.ratio.max;
        // Lowest coffee whose min-ratio water clears the water floor.
        let lo = rules.water_grams.min / rules.ratio.min;
        // Clamp the midpoint into the coffee-amount range with min/max so there
        // are no untaken branches: every row in the table satisfies these
        // bounds, and the assertions below prove the chosen dose is valid.
        (((lo + hi) / 2.0).max(rules.coffee_grams.min)).min(rules.coffee_grams.max)
    }

    #[test]
    fn ratio_boundaries_per_method() {
        let g = grinder(0, 40);
        for method in all_methods() {
            let rules = rules_for(&method);
            // Pick a coffee dose that keeps both ratio bounds inside the water range.
            let coffee = ratio_safe_coffee(&rules);

            // Just inside the lower ratio bound (nudge up to stay in-band).
            let water_low_ok = coffee * (rules.ratio.min + 0.01);
            // Just inside the upper ratio bound.
            let water_high_ok = coffee * (rules.ratio.max - 0.01);
            // Just outside below.
            let water_low_bad = coffee * (rules.ratio.min - 0.05);
            // Just outside above.
            let water_high_bad = coffee * (rules.ratio.max + 0.05);

            // The in-band waters must also sit inside the water-amount range for
            // this assertion to isolate the ratio check; all chosen doses do.
            let low_ok = validate(valid_params(method.clone(), coffee, water_low_ok), &g);
            assert!(low_ok.is_ok(), "{method:?}: ratio just above min should pass");
            let high_ok = validate(valid_params(method.clone(), coffee, water_high_ok), &g);
            assert!(high_ok.is_ok(), "{method:?}: ratio just below max should pass");

            let below = validate(valid_params(method.clone(), coffee, water_low_bad), &g);
            assert!(matches!(below, Err(ValidationErrorType::MethodCoffeeRatioInvalid { .. })), "{method:?}: ratio below min should fail with ratio error, got {below:?}");

            let above = validate(valid_params(method.clone(), coffee, water_high_bad), &g);
            assert!(matches!(above, Err(ValidationErrorType::MethodCoffeeRatioInvalid { .. })), "{method:?}: ratio above max should fail with ratio error, got {above:?}");
        }
    }

    #[test]
    fn coffee_amount_boundaries_per_method() {
        let g = grinder(0, 40);
        for method in all_methods() {
            let rules = rules_for(&method);
            // Choose a ratio that keeps water in-range at BOTH the min and max
            // coffee doses, so the dose boundary is what we actually probe.
            // Upper bound on ratio so max coffee stays under the water ceiling.
            let ratio_hi = rules.water_grams.max / rules.coffee_grams.max;
            // Lower bound on ratio so min coffee clears the water floor.
            let ratio_lo = rules.water_grams.min / rules.coffee_grams.min;
            // Clamp into [ratio_lo, ratio_hi] and the method's ratio band with
            // branch-free min/max; the assertions below prove the result works.
            let mid_ratio = ((rules.ratio.min + rules.ratio.max) / 2.0)
                .min(ratio_hi)
                .max(ratio_lo)
                .max(rules.ratio.min)
                .min(rules.ratio.max);

            // Exactly at the min and max doses (inclusive) should pass.
            let min_coffee = rules.coffee_grams.min;
            let max_coffee = rules.coffee_grams.max;
            let min_ok = validate(valid_params(method.clone(), min_coffee, min_coffee * mid_ratio), &g);
            assert!(min_ok.is_ok(), "{method:?}: min coffee dose should pass");
            let max_ok = validate(valid_params(method.clone(), max_coffee, max_coffee * mid_ratio), &g);
            assert!(max_ok.is_ok(), "{method:?}: max coffee dose should pass");

            // Just below min and just above max should fail with the coffee-amount error.
            let under = validate(
                valid_params(method.clone(), min_coffee - 0.1, (min_coffee - 0.1) * mid_ratio),
                &g,
            );
            assert!(matches!(under, Err(ValidationErrorType::MethodCoffeeAmountInvalid { .. })), "{method:?}: coffee below min should fail, got {under:?}");
            let over = validate(
                valid_params(method.clone(), max_coffee + 0.1, (max_coffee + 0.1) * mid_ratio),
                &g,
            );
            assert!(matches!(over, Err(ValidationErrorType::MethodCoffeeAmountInvalid { .. })), "{method:?}: coffee above max should fail, got {over:?}");
        }
    }

    #[test]
    fn water_amount_boundary_failures() {
        // Drive the water-amount check for a method whose water floor is well
        // above the coffee dose: too little water trips the water-amount error
        // before the ratio check (water below min with a tiny dose).
        let g = grinder(0, 40);
        // FrenchPress water floor is 180 g. Use coffee=15 (min) and water below floor.
        let under = validate(
            BrewParams {
                water_grams: 179.0,
                ..valid_params(BrewingMethod::FrenchPress, 15.0, 179.0)
            },
            &g,
        );
        assert!(matches!(
            under,
            Err(ValidationErrorType::MethodWaterAmountInvalid { .. })
        ));

        // Above the water ceiling for pour-over.
        let over = validate(
            BrewParams {
                coffee_grams: 60.0,
                water_grams: 1081.0,
                ..valid_params(BrewingMethod::V60, 60.0, 1081.0)
            },
            &g,
        );
        assert!(matches!(
            over,
            Err(ValidationErrorType::MethodWaterAmountInvalid { .. })
        ));
    }

    #[test]
    fn temperature_boundaries_and_optional() {
        let g = grinder(0, 40);
        for method in all_methods() {
            let rules = rules_for(&method);
            let (coffee, water) = in_band_amounts(&method);

            // Boundary-inclusive temps pass.
            let at_min = BrewParams {
                water_temp_celsius: Some(rules.water_temp_celsius.min),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(validate(at_min, &g).is_ok(), "{:?}: min temp should pass", method);
            let at_max = BrewParams {
                water_temp_celsius: Some(rules.water_temp_celsius.max),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(validate(at_max, &g).is_ok(), "{:?}: max temp should pass", method);

            // Just outside fails with the temperature error.
            let too_cold = BrewParams {
                water_temp_celsius: Some(rules.water_temp_celsius.min - 1),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(matches!(
                validate(too_cold, &g),
                Err(ValidationErrorType::MethodWaterTemperatureInvalid { .. })
            ));
            let too_hot = BrewParams {
                water_temp_celsius: Some(rules.water_temp_celsius.max + 1),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(matches!(
                validate(too_hot, &g),
                Err(ValidationErrorType::MethodWaterTemperatureInvalid { .. })
            ));

            // Absent temperature skips the check.
            let no_temp = BrewParams {
                water_temp_celsius: None,
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(validate(no_temp, &g).is_ok(), "{:?}: absent temp should pass", method);
        }
    }

    #[test]
    fn brew_time_boundaries_and_optional() {
        let g = grinder(0, 40);
        for method in all_methods() {
            let rules = rules_for(&method);
            let (coffee, water) = in_band_amounts(&method);

            let at_min = BrewParams {
                brew_time_seconds: Some(rules.brew_time_seconds.min),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(validate(at_min, &g).is_ok(), "{:?}: min time should pass", method);
            let at_max = BrewParams {
                brew_time_seconds: Some(rules.brew_time_seconds.max),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(validate(at_max, &g).is_ok(), "{:?}: max time should pass", method);

            let too_short = BrewParams {
                brew_time_seconds: Some(rules.brew_time_seconds.min - 1),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(matches!(
                validate(too_short, &g),
                Err(ValidationErrorType::MethodBrewTimeInvalid { .. })
            ));
            let too_long = BrewParams {
                brew_time_seconds: Some(rules.brew_time_seconds.max + 1),
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(matches!(
                validate(too_long, &g),
                Err(ValidationErrorType::MethodBrewTimeInvalid { .. })
            ));

            let no_time = BrewParams {
                brew_time_seconds: None,
                ..valid_params(method.clone(), coffee, water)
            };
            assert!(validate(no_time, &g).is_ok(), "{:?}: absent time should pass", method);
        }
    }

    #[test]
    fn grind_setting_against_grinder_range() {
        let g = grinder(5, 30);
        let (coffee, water) = in_band_amounts(&BrewingMethod::V60);

        // In range (inclusive boundaries) passes.
        for setting in [5, 18, 30] {
            let params = BrewParams {
                grind_setting: setting,
                ..valid_params(BrewingMethod::V60, coffee, water)
            };
            assert!(validate(params, &g).is_ok(), "setting {} should pass", setting);
        }

        // Below min and above max fail with the grinder error naming the range.
        let below = validate(
            BrewParams { grind_setting: 4, ..valid_params(BrewingMethod::V60, coffee, water) },
            &g,
        );
        // Error is the grind-setting variant and its message names the field,
        // the offending value, and the grinder's range.
        assert!(matches!(
            below,
            Err(ValidationErrorType::GrindSettingOutOfRange {
                setting: 4,
                min: 5,
                max: 30,
                ..
            })
        ));
        assert_eq!(
            below.unwrap_err().to_string(),
            "Grind setting 4 outside range 5-30 for Comandante C40"
        );
        let above = validate(
            BrewParams { grind_setting: 31, ..valid_params(BrewingMethod::V60, coffee, water) },
            &g,
        );
        assert!(matches!(
            above,
            Err(ValidationErrorType::GrindSettingOutOfRange { .. })
        ));
    }

    #[test]
    fn rating_rule_stays_global() {
        let g = grinder(0, 40);
        let (coffee, water) = in_band_amounts(&BrewingMethod::V60);

        // Absent rating is fine.
        let none = BrewParams { rating: None, ..valid_params(BrewingMethod::V60, coffee, water) };
        assert!(validate(none, &g).is_ok());

        // Valid rating passes.
        let ok = BrewParams { rating: Some(7.5), ..valid_params(BrewingMethod::V60, coffee, water) };
        assert!(validate(ok, &g).is_ok());

        // Out-of-step rating is rejected by the global rating rule.
        let bad = BrewParams { rating: Some(7.3), ..valid_params(BrewingMethod::V60, coffee, water) };
        assert!(matches!(
            validate(bad, &g),
            Err(ValidationErrorType::InvalidQualityRating { .. })
        ));
    }

    #[test]
    fn validated_params_build_a_session() {
        let g = grinder(0, 40);
        let params = valid_params(BrewingMethod::Espresso, 18.0, 36.0);
        let bean_id = params.bean_id;
        let grinder_id = params.grinder_id;
        let validated = validate(params, &g).unwrap();

        // Accessors expose the validated data.
        assert_eq!(validated.params().coffee_grams, 18.0);
        assert!((validated.coffee_ratio() - 2.0).abs() < f32::EPSILON);

        let id = Uuid::new_v4();
        let now = Utc::now();
        let session = validated.into_session(id, now);
        assert_eq!(session.id, id);
        assert_eq!(session.bean_id, bean_id);
        assert_eq!(session.grinder_id, grinder_id);
        assert_eq!(session.brewing_method, BrewingMethod::Espresso);
        assert_eq!(session.coffee_grams, 18.0);
        assert_eq!(session.water_grams, 36.0);
        assert_eq!(session.coffee_ratio, Some(2.0));
        assert_eq!(session.created_at, now);
        assert_eq!(session.updated_at, now);
        assert!(!session.is_template);
        assert!(session.tasting_notes.is_none());
        assert!(session.feedback.is_none());
        assert!(session.suggestions.is_none());
    }

    #[test]
    fn rules_table_is_internally_consistent() {
        // Every method's coffee/water ranges must admit at least one pair whose
        // ratio lies inside the method's ratio band; otherwise the table would
        // make the method impossible to log.
        for method in all_methods() {
            let r = rules_for(&method);
            // Lowest achievable ratio: min water over max coffee.
            let min_ratio = r.water_grams.min / r.coffee_grams.max;
            // Highest achievable ratio: max water over min coffee.
            let max_ratio = r.water_grams.max / r.coffee_grams.min;
            // The achievable ratio window must overlap the method's ratio band.
            assert!(min_ratio <= r.ratio.max && max_ratio >= r.ratio.min, "{method:?}: amount ranges cannot reach the ratio band");
            // Ranges must be well-formed.
            assert!(r.ratio.min <= r.ratio.max);
            assert!(r.coffee_grams.min <= r.coffee_grams.max);
            assert!(r.water_grams.min <= r.water_grams.max);
            assert!(r.water_temp_celsius.min <= r.water_temp_celsius.max);
            assert!(r.brew_time_seconds.min <= r.brew_time_seconds.max);
        }
    }
}
