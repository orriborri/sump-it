# Coffee Brewer - Consolidated Application

## Project Overview
A comprehensive coffee brewing tracker application combining the best features from three separate repositories into a unified TypeScript frontend + Rust backend with tRPC-like communication.

## Architecture
- **Frontend**: Next.js 15 with TypeScript, Material-UI, React Query
- **Backend**: Rust with Axum, SQLx, PostgreSQL
- **Database**: PostgreSQL with custom enums and CHECK constraints
- **Communication**: Type-safe API calls with tRPC-like client
- **DevOps**: Docker Compose for local development

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
1. Run `./setup.sh` to start Docker containers
2. Frontend: http://localhost:3000
3. Backend API: http://localhost:3001
4. Database: PostgreSQL on port 5432

## Agent Skills
This repository has Matt Pocock's skills installed for improved engineering workflows. Available skills include:
- `/grill-me` - For detailed requirements gathering
- `/code-review` - For code quality checks
- `/tdd` - For test-driven development
- `/implement` - For implementation tasks
- `/setup-matt-pocock-skills` - For configuring skills
- And many more...

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
- **Backend**: Rust unit and integration tests
- **Frontend**: React Testing Library, Jest
- **E2E**: Playwright for user workflows
- **Validation**: Property-based testing for core logic

## Deployment
- Docker-based deployment
- PostgreSQL with connection pooling
- Environment-based configuration
- Health checks and monitoring