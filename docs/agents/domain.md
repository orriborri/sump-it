# Domain Configuration

## Documentation Structure
This repository uses a single-context documentation approach.

### Primary Documentation Files
1. **`README.md`** - Project overview and getting started
2. **`CONSOLIDATION_SUMMARY.md`** - Detailed consolidation rationale
3. **`docs/` directory** - Additional documentation

### Domain-Specific Files
- **Architecture decisions**: Recorded in code comments and README
- **API documentation**: Inline in Rust/TypeScript code
- **Configuration**: `.env.example`, `docker-compose.yml`

### Context Boundaries
- **Frontend**: Next.js 15 with TypeScript, Material-UI
- **Backend**: Rust with Axum, PostgreSQL, SQLx
- **Database**: PostgreSQL with custom enums and constraints
- **DevOps**: Docker Compose for local development

## Project Context
This is a consolidated coffee brewing application that combines three separate repositories:
1. **sump-it**: Vertical stepper UI and brewing workflow
2. **rustyCoffy**: Comprehensive validation and business logic
3. **BeanIt**: Type-safe APIs and modern architecture

## Key Domain Concepts
- Coffee beans with inventory tracking
- Grinder equipment with setting ranges
- Brewing sessions with comprehensive parameters
- Brewing methods (V60, Chemex, French Press, etc.)
- Feedback and tasting notes
- Coffee-to-water ratio validation (per-method bands via `rules_for` in `backend/src/recipe.rs`)