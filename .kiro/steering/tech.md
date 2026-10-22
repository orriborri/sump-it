# Coffee Brewer - Technology Stack

## Architecture Overview
- **Frontend**: Next.js 15 with TypeScript, Material-UI, React Query
- **Backend**: Rust with Axum, SQLx, PostgreSQL
- **Database**: PostgreSQL with custom enums and CHECK constraints
- **Communication**: Typed REST contract; TypeScript types generated from the Rust models via ts-rs and consumed by a thin typed fetch client
- **DevOps**: Docker Compose for local development

## Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **UI Library**: Material-UI with custom coffee theme
- **State Management**: React Query for server state
- **Styling**: Emotion with CSS-in-JS
- **Form Handling**: React Hook Form with Zod validation
- **API Client**: Thin typed fetch client (`lib/trpc/client.ts`) using ts-rs-generated types (the `lib/trpc/` directory name is historical; there is no tRPC server or router)

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
- **CI/CD**: GitHub Actions (planned)
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

## Performance Considerations
- Connection pooling for database
- Efficient React Query caching
- Compiled Rust backend for performance
- Proper database indexing
- CDN for static assets (planned)