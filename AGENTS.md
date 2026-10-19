# Coffee Brewer - Agent Configuration

## Project Context
Consolidated coffee brewing application combining three repositories:
1. **sump-it**: Vertical stepper UI and brewing workflow
2. **rustyCoffy**: Comprehensive validation and business logic
3. **BeanIt**: Type-safe APIs and modern architecture

## Available Skills
This workspace has 38 Matt Pocock engineering skills installed in `.kiro/skills/`, plus the repository-specific `kiro-web-github-automation` skill:

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

### Kiro Web Automation
- **`kiro-web-github-automation`** - GitHub issue triggers, `kiro` labels, `/kiro` comments, and scheduled Kiro Web Automations
- Native Kiro invocation uses the `kiro` label or `/kiro` in an issue comment; `@kiro` is not documented as a trigger
- Use `ready-for-agent` for project triage, and add `kiro` when work should start immediately
- Scheduled frontier selection belongs in Kiro Web Automations, not `.kiro/hooks`
- Kiro opens pull requests; humans review and merge them

## Domain-Specific Guidance

### Coffee Brewing Concepts
- **Coffee Beans**: Track name, origin, roast date, remaining quantity
- **Grinders**: Equipment with brand, model, type, setting ranges
- **Brewing Sessions**: Complete parameter tracking with validation
- **Brewing Methods**: V60, Chemex, French Press, AeroPress, etc.
- **Coffee Ratio**: Must be between 15.0-17.0 (water:coffee)

### Validation Rules
1. Coffee amount: 10.0-100.0g
2. Water amount: 150.0-1700.0ml  
3. Rating: 1.0-10.0 in 0.5 increments
4. Grind setting: Within grinder's min-max range
5. Bean quantity: Sufficient for brewing session

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
- **Validation rules**: `backend/src/validation.rs` for all constraints