# Coffee Brewer - Domain Glossary

## Core Entities

### Coffee Bean
- **Definition**: A coffee bean with inventory tracking
- **Attributes**: name, origin, roast date, purchase date, remaining grams, variety, processing method
- **Business Rules**: 
  - Remaining grams cannot be negative
  - Roast date must be before purchase date
  - Beans are considered "fresh" within 30 days of roast

### Grinder
- **Definition**: Coffee grinding equipment with setting ranges
- **Attributes**: brand, model, grinder type, min setting, max setting, scale type
- **Types**: BurrConical, BurrFlat, Blade, Manual, Electric
- **Business Rules**:
  - Max setting must be greater than min setting
  - Settings must be non-negative

### Brewing Session
- **Definition**: A complete coffee brewing session record
- **Attributes**: bean, grinder, brewing method, grind setting, water temp, brew time, coffee grams, water grams, rating, tasting notes
- **Business Rules**:
  - Coffee ratio, dose, water, temperature, and brew time must satisfy the selected method's rules in `backend/src/recipe.rs`
  - Rating must be in 0.5 increments from 1.0-10.0
  - Coffee and water amounts use method-specific ranges
  - Grind setting must be within grinder's range

### Brewing Method
- **Definition**: Technique used to brew coffee
- **Values**: V60, Chemex, French Press, AeroPress, Espresso, Moka, ColdBrew, Other

## Key Concepts

### Coffee Ratio
- **Formula**: `water_grams / coffee_grams`
- **Valid Range**: Method-specific; espresso is near 1:2, while immersion and pour-over methods are commonly near 1:12-1:18
- **Example**: 20g coffee + 320g water is a 16:1 ratio suitable for methods whose configured band includes it

### Grind Setting Validation
- Each grinder has a valid range (min-max)
- Settings must be integers within this range
- Validation occurs at both application and database levels

### Inventory Management
- Beans track remaining quantity in grams
- Brewing sessions automatically decrement bean quantity
- Insufficient quantity prevents brewing

### Session Filtering
- Filter by bean origin
- Filter by roast date range
- Filter by grinder type
- Filter by minimum rating
- Search across multiple fields

## Technical Terms

### Vertical Stepper
- Unique UI component from original sump-it
- 3-step workflow: Equipment → Parameters → Rate
- Progressive disclosure pattern
- Coffee-themed styling

### Type Safety
- Full TypeScript/TypeScript type safety
- A thin typed REST client uses TypeScript bindings generated from the Rust models with ts-rs
- Database constraints for data integrity

### Validation Layers
1. **Frontend**: Zod schemas in TypeScript
2. **Backend**: Rust validation with custom error types
3. **Database**: PostgreSQL CHECK constraints
4. **Business Logic**: Domain validation in service layer
