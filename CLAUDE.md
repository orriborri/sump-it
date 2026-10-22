# Coffee Brewer - Consolidated Application

## Project Overview
A comprehensive coffee brewing tracker application combining the best features from three separate repositories into a unified TypeScript frontend + Rust backend with a typed REST contract (TypeScript types generated from the Rust models via ts-rs).

## Architecture
- **Frontend**: Next.js 15 with TypeScript, Material-UI, React Query
- **Backend**: Rust with Axum, SQLx, PostgreSQL
- **Database**: PostgreSQL with custom enums and CHECK constraints
- **Communication**: Typed REST contract; TypeScript types generated from the Rust models via ts-rs and consumed by a thin typed fetch client
- **Tests/Coverage**: `make coverage` (100%-line backend via cargo-llvm-cov against a real Postgres, 100% frontend via Vitest). CI runs it with a Postgres service container.

## Key Features Consolidated

### From sump-it:
- ✅ Integrated Vertical Stepper with 3-step brewing workflow
- ✅ Coffee-themed UI (#8B4513 brown, #4CAF50 green)
- ✅ Progressive disclosure (only current step shows content)
- ✅ Previous brew feedback integration

### From rustyCoffy:
- ✅ Comprehensive validation with database constraints
- ✅ Bean inventory management with quantity tracking
- ✅ Advanced session filtering and search
- ✅ Business logic layer with connection pooling

### From BeanIt:
- ✅ Type-safe APIs with proper REST structure
- ✅ UUID identifiers and modern architecture
- ✅ API-first design approach
- ✅ Scalable project structure

## Development Setup
The backend (Rust/Axum/SQLx) talks to a PostgreSQL database named by
`DATABASE_URL`. Point it at any reachable Postgres and apply the migrations in
`backend/migrations/` (sqlx migrations are the only schema source). The typed
frontend contract under `frontend/lib/generated/` is produced from the Rust
models by `cd backend && cargo test export_bindings` and must stay diff-free
(CI fails on any drift).

Run the full test + coverage gate with `make coverage` (needs a reachable
`DATABASE_URL` for the backend half; see `docs/coverage.md`).

## Agent skills

### AI SDLC loops
See `docs/agents/ai-sdlc.md` and `REVIEW.md`. Accepted work lives under
`docs/changes/<issue>/`: intent → spec → plan → implementation/evidence.
CI delivery stages never approve, merge or deploy. Verify using
`bash scripts/ai-verify.sh`; report blockers and pending visual checks honestly.
Review fixes need evidence or a reasoned disagreement in `review-response.md`.

### Issue tracker
Issues are tracked in GitHub Issues at https://github.com/orriborri/sump-it/issues. See `docs/agents/issue-tracker.md`.

### Triage labels
Uses default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
Single-context documentation with `GLOSSARY.md` at repo root and `docs/` directory for additional documentation. See `docs/agents/domain.md`.

## Available Skills
This repository has Matt Pocock's complete skill set installed (38 skills) including:
- `/grill-me` - For detailed requirements gathering and alignment
- `/code-review` - For comprehensive code quality checks
- `/tdd` - For test-driven development workflows
- `/implement` - For structured implementation tasks
- `/setup-matt-pocock-skills` - For repository configuration
- `/diagnosing-bugs` - For systematic bug diagnosis
- `/domain-modeling` - For domain-driven design
- `/handoff` - For smooth task handoffs
- `/prototype` - For rapid prototyping
- And 29 more engineering skills

## Issue Tracking
- Uses GitHub Issues: https://github.com/orriborri/sump-it/issues
- CLI: `gh` for GitHub operations
- Triage labels: Standard GitHub + custom labels

## Code Style Guidelines
- **TypeScript**: Strict mode, explicit types, no `any`
- **Rust**: Clippy clean, proper error handling
- **SQL**: Use migrations, proper indexes, constraints
- **Commits**: Conventional commits with clear messages

## Testing Strategy
- **Backend**: Rust unit tests plus `#[ignore]`d DB integration tests under
  `backend/tests/*_db.rs` that drive the real compiled services/router against a
  live Postgres (`--include-ignored --test-threads=1`).
- **Frontend**: Vitest + React Testing Library, with the typed client replaced
  by a fake.
- **Coverage gate**: `make coverage` enforces 100% lines backend (cargo-llvm-cov,
  pinned nightly) and 100% statements/branches/functions/lines frontend. See
  `docs/coverage.md`.

## Deployment
- PostgreSQL with connection pooling
- Environment-based configuration (`DATABASE_URL`)
- Health checks and monitoring
