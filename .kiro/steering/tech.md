# Coffee Brewer - Technology Stack

## Architecture Overview
- **Frontend**: Next.js 15 with TypeScript, Material-UI, React Query
- **Backend**: Rust with Axum, SQLx, PostgreSQL
- **Database**: PostgreSQL with custom enums and CHECK constraints
- **Communication**: Type-safe API calls with tRPC-like client
- **DevOps**: Docker Compose for local development

## Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: Material-UI with custom coffee theme
- **State Management**: React Query for server state
- **Styling**: Emotion with CSS-in-JS
- **Form Handling**: React Hook Form with Zod validation
- **API Client**: Custom tRPC-like client with type safety

## Backend Stack
- **Language**: Rust 2021 edition
- **Web Framework**: Axum with middleware support
- **Database**: PostgreSQL with SQLx for type-safe queries
- **ORM/Query Builder**: SQLx (compile-time checked)
- **Validation**: Comprehensive Rust validation with custom error types
- **Authentication**: (Planned) JWT-based auth
- **Logging**: Tracing with OpenTelemetry

## Database Design
- **Engine**: PostgreSQL 15+
- **Features**: Custom enum types, CHECK constraints, generated columns
- **Constraints**: Data integrity validation at database level
- **Indexing**: Optimized for common query patterns
- **Migrations**: SQLx migrations with version control

## Development Tools
- **Version Control**: Git with conventional commits
- **Package Managers**: npm (frontend), Cargo (backend)
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: GitHub Actions and Kiro Web Automations
- **Agent workflow**: `ready-for-agent` for triage, `kiro` label or `/kiro` comment for immediate implementation, scheduled Automations for frontier polling
- **Testing**: Jest (frontend), cargo test (backend), Playwright (E2E)
- **Linting**: ESLint, Clippy, Prettier, rustfmt

## Key Technical Decisions
1. **Type Safety**: Full TypeScript/Rust type safety throughout
2. **Vertical Stepper**: Preserved from sump-it for unique UX
3. **Database Constraints**: From rustyCoffy for data integrity
4. **API Design**: REST with proper status codes from BeanIt
5. **Validation**: Multiple layers (frontend, backend, database)

## Dependencies
See `package.json` (frontend) and `Cargo.toml` (backend) for complete dependency lists.

## Kiro Web Automation Rules
- Kiro Web's native GitHub triggers are the `kiro` label and `/kiro` issue comments; `@kiro` is not a documented trigger.
- Scheduled repository polling uses Kiro Web Automations, not `.kiro/hooks`.
- An automation must select the oldest open `ready-for-agent` issue whose `Blocked by` issues are closed.
- Automations may create pull requests but must not merge them automatically.
- See `.kiro/skills/kiro-web-github-automation/SKILL.md` for the operational prompt and official documentation links.

## Performance Considerations
- Connection pooling for database
- Efficient React Query caching
- Compiled Rust backend for performance
- Proper database indexing
- CDN for static assets (planned)