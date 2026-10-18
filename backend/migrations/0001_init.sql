-- Initial schema for the consolidated coffee brewing backend.
-- This sqlx migration is the single source of truth for the database schema.
-- Enum text values must match the Rust serde casing used by the domain models
-- (GrinderType and BrewingMethod serialize as e.g. `BurrConical`, `V60`).

-- Enum types -----------------------------------------------------------------

CREATE TYPE brewing_method AS ENUM (
    'V60', 'Chemex', 'FrenchPress', 'AeroPress',
    'Espresso', 'Moka', 'ColdBrew', 'Other'
);

CREATE TYPE grinder_type AS ENUM (
    'BurrConical', 'BurrFlat', 'Blade', 'Manual', 'Electric'
);

-- Coffee beans ----------------------------------------------------------------

CREATE TABLE coffee_beans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    origin VARCHAR(100) NOT NULL,
    roast_date DATE NOT NULL,
    purchase_date DATE NOT NULL,
    remaining_grams REAL,
    variety VARCHAR(100),
    processing_method VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (remaining_grams >= 0 OR remaining_grams IS NULL),
    CHECK (roast_date <= purchase_date)
);

-- Grinders --------------------------------------------------------------------

CREATE TABLE grinders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    grinder_type grinder_type NOT NULL,
    min_setting INTEGER NOT NULL DEFAULT 0,
    max_setting INTEGER NOT NULL DEFAULT 40,
    scale_type VARCHAR(20),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (min_setting >= 0),
    CHECK (max_setting > min_setting)
);

-- Brewing sessions ------------------------------------------------------------

CREATE TABLE brewing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Equipment selection
    bean_id UUID NOT NULL REFERENCES coffee_beans(id) ON DELETE CASCADE,
    grinder_id UUID NOT NULL REFERENCES grinders(id) ON DELETE CASCADE,
    brewing_method brewing_method NOT NULL,

    -- Brewing parameters
    grind_setting INTEGER NOT NULL,
    water_temp_celsius INTEGER,
    brew_time_seconds INTEGER,
    coffee_grams REAL NOT NULL,
    water_grams REAL NOT NULL,

    -- Results and feedback
    rating REAL,
    tasting_notes TEXT,
    feedback TEXT,
    suggestions TEXT,
    is_template BOOLEAN NOT NULL DEFAULT false,

    -- Calculated field
    coffee_ratio REAL GENERATED ALWAYS AS (water_grams / coffee_grams) STORED,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Database-level validation
    CHECK (coffee_grams >= 10.0 AND coffee_grams <= 100.0),
    CHECK (water_grams >= 150.0 AND water_grams <= 1700.0),
    CHECK ((water_grams / coffee_grams) >= 15.0 AND (water_grams / coffee_grams) <= 17.0),
    CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 10.0)),
    CHECK (water_temp_celsius IS NULL OR (water_temp_celsius >= 60 AND water_temp_celsius <= 100)),
    CHECK (brew_time_seconds IS NULL OR (brew_time_seconds >= 30 AND brew_time_seconds <= 480)),
    CHECK (grind_setting >= 0)
);

-- Brew feedback ---------------------------------------------------------------

CREATE TABLE brew_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES brewing_sessions(id) ON DELETE CASCADE,
    grind_notes TEXT,
    extraction_notes TEXT,
    aroma_rating INTEGER,
    acidity_rating INTEGER,
    body_rating INTEGER,
    aftertaste_rating INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (aroma_rating IS NULL OR (aroma_rating >= 1 AND aroma_rating <= 5)),
    CHECK (acidity_rating IS NULL OR (acidity_rating >= 1 AND acidity_rating <= 5)),
    CHECK (body_rating IS NULL OR (body_rating >= 1 AND body_rating <= 5)),
    CHECK (aftertaste_rating IS NULL OR (aftertaste_rating >= 1 AND aftertaste_rating <= 5))
);

-- Indexes ---------------------------------------------------------------------

CREATE INDEX idx_coffee_beans_active ON coffee_beans(is_active);
CREATE INDEX idx_coffee_beans_roast ON coffee_beans(roast_date DESC);
CREATE INDEX idx_grinders_brand ON grinders(brand);
CREATE INDEX idx_grinders_type ON grinders(grinder_type);
CREATE INDEX idx_brewing_sessions_bean ON brewing_sessions(bean_id);
CREATE INDEX idx_brewing_sessions_grinder ON brewing_sessions(grinder_id);
CREATE INDEX idx_brewing_sessions_method ON brewing_sessions(brewing_method);
CREATE INDEX idx_brewing_sessions_rating ON brewing_sessions(rating DESC NULLS LAST);
CREATE INDEX idx_brewing_sessions_created ON brewing_sessions(created_at DESC);
CREATE INDEX idx_brewing_sessions_template ON brewing_sessions(is_template);

-- Composite indexes for common query patterns
CREATE INDEX idx_sessions_composite ON brewing_sessions(bean_id, grinder_id, brewing_method);
CREATE INDEX idx_sessions_rating_date ON brewing_sessions(rating DESC NULLS LAST, created_at DESC);
