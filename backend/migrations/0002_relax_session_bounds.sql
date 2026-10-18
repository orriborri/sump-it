-- Ticket #145: relax the global brewing-session bounds so per-method recipes
-- are the single source of truth.
--
-- Ticket #138 shipped method-agnostic CHECK constraints on `brewing_sessions`
-- (coffee 10-100 g, water 150-1700 g, ratio 15-17, temperature 60-100 C, brew
-- time 30-480 s). Ticket #144 introduced per-method recipe rules in
-- `backend/src/recipe.rs` (Espresso ~1:2, Moka ~1:8, Cold Brew cold + hours,
-- etc.) that the old global bands make impossible to persist: a valid Espresso
-- (18 g / 36 g, ratio 2.0, 93 C, 30 s) violates the coffee, water, ratio and
-- time CHECKs, and Cold Brew violates the temperature CHECK.
--
-- The application now validates every amount/ratio/temperature/time value per
-- method, keyed off `BrewingMethod` and the selected grinder, via
-- `recipe::validate` BEFORE the insert, and the insert happens inside a single
-- transaction with the bean-inventory decrement. The database therefore keeps
-- only method-invariant guards:
--   * `grind_setting >= 0`           (a dial position is never negative)
--   * `rating IS NULL OR 1.0..=10.0` (the rating scale is global)
--   * `coffee_grams > 0`             (so the generated ratio never divides by
--                                     zero / goes negative)
--   * `water_grams > 0`
-- and drops the per-method-conflicting bands.
--
-- This migration is written to run against the schema created by 0001_init.sql
-- and is DB-required; the ticket #145 sandbox has no Postgres, so it is NOT
-- executed here (see tests/session_logging_db.rs).

ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_coffee_grams_check,
    DROP CONSTRAINT IF EXISTS brewing_sessions_water_grams_check,
    DROP CONSTRAINT IF EXISTS brewing_sessions_coffee_ratio_check,
    DROP CONSTRAINT IF EXISTS brewing_sessions_water_temp_check,
    DROP CONSTRAINT IF EXISTS brewing_sessions_brew_time_check;

-- Keep a minimal positivity guard so the STORED generated `coffee_ratio`
-- column (water_grams / coffee_grams) is always well-defined and positive.
ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_coffee_grams_positive
        CHECK (coffee_grams > 0.0),
    ADD CONSTRAINT brewing_sessions_water_grams_positive
        CHECK (water_grams > 0.0);
