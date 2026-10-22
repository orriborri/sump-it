# Coffee Brewer - Agent Configuration

## Project Context
Consolidated coffee brewing application combining three repositories:
1. **sump-it**: Vertical stepper UI and brewing workflow
2. **rustyCoffy**: Comprehensive validation and business logic
3. **BeanIt**: Type-safe APIs and modern architecture

## Available Skills
This workspace has 38 Matt Pocock engineering skills installed in `.kiro/skills/`:

### Core Engineering Skills
- **`grill-me`** - Requirements gathering and alignment
- **`code-review`** - Comprehensive code quality checks  
- **`tdd`** - Test-driven development workflows
- **`implement`** - Structured implementation tasks
- **`triage`** - Issue categorization with default labels
- **`to-spec`** - Converting requirements to specifications
- **`to-tickets`** - Creating GitHub issues
- **`wayfinder`** - Navigating complex codebases

### Specialized Skills
- **`diagnosing-bugs`** - Systematic bug diagnosis
- **`domain-modeling`** - Domain-driven design
- **`handoff`** - Smooth task handoffs
- **`prototype`** - Rapid prototyping
- **`research`** - Technical research
- **`retro`** - Retrospectives

### Configuration Skills
- **`setup-matt-pocock-skills`** - Repository configuration
- **`setup-pre-commit`** - Pre-commit hook setup
- **`setup-ts-deep-modules`** - TypeScript module configuration

## Domain-Specific Guidance

### Coffee Brewing Concepts
- **Coffee Beans**: Track name, origin, roast date, remaining quantity
- **Grinders**: Equipment with brand, model, type, setting ranges
- **Brewing Sessions**: Complete parameter tracking with validation
- **Brewing Methods**: Espresso, Moka, AeroPress, French Press, V60, Chemex, Cold Brew, Other
- **Coffee Ratio**: Per-method water:coffee band, not a single global range.
  Espresso brews near 1:2 while a French Press or pour-over sits near 1:15, so
  the accepted ratio depends on the method.

### Validation Rules
Brewing rules are **per method**, not global. The single source of truth is the
`rules_for` table in `backend/src/recipe.rs`, which keys each method to its
accepted ratio, coffee dose, water weight, temperature, and brew-time ranges
(e.g. Espresso allows 7-25 g coffee and 10-75 g water; French Press and the
pour-over cones sit in the 1:12-1:18 bands). Adjusting a method is a one-line
edit to its row there.

Only method-invariant checks stay global:
1. Rating: 1.0-10.0 in 0.5 increments
2. Grind setting: within the chosen grinder's min-max range
3. Grind setting must be non-negative (enforced on the request model)
4. Bean quantity: sufficient for the session (checked in the save transaction;
   insufficient quantity is an error with available/required grams, never a
   silent clamp; beans that do not track a quantity never block a brew)

### Technical Constraints
- **Frontend**: Next.js 15 with TypeScript, Material-UI
- **Backend**: Rust with Axum, SQLx, PostgreSQL
- **Database**: PostgreSQL with custom enums and CHECK constraints
- **UI**: Preserve vertical stepper from sump-it (#8B4513 brown theme)

## Issue Tracker Configuration
- **Location**: GitHub Issues (https://github.com/orriborri/sump-it/issues)
- **Labels**: Uses default triage vocabulary
- **CLI**: `gh` for GitHub operations

## Development Guidelines
For GitHub automation, follow `docs/agents/ai-sdlc.md` and `REVIEW.md`.
Accepted intent/spec/plan live under `docs/changes/<issue>/`. Use
`bash scripts/ai-verify.sh` for the contract/types/coverage feedback loop.
Never approve, merge or deploy through an agent stage.

1. **Start with `grill-me`** for requirements alignment
2. **Use `tdd`** for test-driven development
3. **Apply `code-review`** before committing
4. **Follow type safety** (TypeScript strict, Rust clippy clean)
5. **Preserve coffee theme** (#8B4513 brown, #4CAF50 green)

## Common Tasks
- **Add new feature**: Use `grill-me` → `to-spec` → `implement` → `code-review`
- **Fix bug**: Use `diagnosing-bugs` → `implement` → `code-review`
- **Refactor code**: Use `codebase-design` → `implement` → `code-review`
- **Create documentation**: Use `domain-modeling` for domain docs

## References
- **Steering files**: `.kiro/steering/` for project context
- **Domain glossary**: `GLOSSARY.md` for coffee brewing terms
- **API documentation**: Inline in Rust/TypeScript code
- **Recipe rules**: `backend/src/recipe.rs` for the per-method brewing table
- **Method-invariant checks**: `backend/src/validation.rs` (rating, grinder range)
- **Coverage / tests**: `make coverage` (see `docs/coverage.md`)
