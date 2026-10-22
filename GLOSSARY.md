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
  - Coffee ratio must fall within the per-method band (water:coffee) defined by `rules_for` in `backend/src/recipe.rs`
  - Rating must be in 0.5 increments from 1.0-10.0
  - Coffee amount: 10.0-100.0g
  - Water amount: 150.0-1700.0ml
  - Grind setting must be within grinder's range

### Brewing Method
- **Definition**: Technique used to brew coffee
- **Values**: V60, Chemex, French Press, AeroPress, Espresso, Moka, ColdBrew, Other

## Key Concepts

### Coffee Ratio
- **Formula**: `water_grams / coffee_grams`
- **Valid Range**: 15.0 to 17.0
- **Example**: 20g coffee + 320g water = 16:1 ratio

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
- tRPC-like communication between frontend and backend
- Database constraints for data integrity

### Validation Layers
1. **Frontend**: Zod schemas in TypeScript
2. **Backend**: Rust validation with custom error types
3. **Database**: PostgreSQL CHECK constraints
4. **Business Logic**: Domain validation in service layer