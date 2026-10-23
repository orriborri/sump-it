# Coffee Brewer - Project Structure

## Repository Layout
```
coffee-brewer-consolidated/
├── .kiro/                    # Kiro configuration
│   ├── steering/            # Project context and guidelines
│   └── skills/              # Agent skills (38 Matt Pocock skills)
├── backend/                 # Rust backend
│   ├── src/
│   │   ├── api/            # REST API endpoints
│   │   ├── models/         # Domain models with validation
│   │   ├── services/       # Business logic layer
│   │   ├── database/       # Database operations
│   │   └── validation/     # Comprehensive validation logic
│   ├── migrations/         # SQLx migrations (single schema source)
│   └── Cargo.toml
├── frontend/                # Next.js 15 frontend
│   ├── app/
│   │   ├── brew/           # Vertical stepper brewing workflow
│   │   ├── beans/          # Bean management
│   │   ├── grinders/       # Grinder management
│   │   └── sessions/       # Brew session history
│   ├── lib/
│   │   ├── trpc/           # Thin typed REST client (ts-rs generated types); directory name is historical, no tRPC server
│   │   └── utils/          # Shared utilities
│   └── package.json
├── docs/                    # Documentation
│   ├── agents/             # Agent skills configuration
│   └── api/               # API documentation (planned)
├── docker-compose.yml      # Development environment
├── .env.example            # Environment variables
├── README.md              # Project overview
└── GLOSSARY.md           # Domain terminology
```

## Key Directories Explained

### `.kiro/skills/`
Contains 38 Matt Pocock engineering skills including:
- `/grill-me` - Requirements gathering and alignment
- `/code-review` - Code quality checks
- `/tdd` - Test-driven development
- `/implement` - Structured implementation
- `/setup-matt-pocock-skills` - Repository configuration

### `backend/src/api/`
REST API endpoints organized by domain:
- `beans/` - Coffee bean management
- `grinders/` - Grinder equipment management  
- `sessions/` - Brewing session tracking
- `feedback/` - Brew feedback and ratings

### `frontend/app/brew/`
Vertical stepper UI components (from original sump-it):
- `IntegratedVerticalStepper.tsx` - Unique 3-step workflow
- `BeanSelector.tsx` - Equipment selection
- `BrewingParameters.tsx` - Parameter configuration
- `BrewFeedback.tsx` - Results and rating

## Module Boundaries

### Frontend Modules
1. **Brewing Workflow** (`app/brew/`) - Core brewing interface
2. **Inventory Management** (`app/beans/`, `app/grinders/`) - Equipment tracking
3. **History & Analytics** (`app/sessions/`) - Session review and insights
4. **Shared Utilities** (`lib/`) - Reusable components and hooks

### Backend Modules
1. **API Layer** (`src/api/`) - HTTP request handling
2. **Domain Models** (`src/models/`) - Business entities and validation
3. **Service Layer** (`src/services/`) - Business logic
4. **Data Access** (`src/database/`) - Database operations

## Data Flow
1. User interacts with vertical stepper in frontend
2. Frontend makes type-safe API calls to backend
3. Backend validates input using comprehensive validation
4. Business logic executes with proper error handling
5. Data persisted to PostgreSQL with constraints
6. Results returned to frontend for display

## Configuration Files
- **Environment**: `.env` (created from `.env.example`)
- **Database**: SQLx migrations under `backend/migrations/`
- **Dependencies**: `package.json`, `Cargo.toml`
- **Development**: `docker-compose.yml`
- **Documentation**: `CLAUDE.md`, `GLOSSARY.md`, `CONSOLIDATION_SUMMARY.md`

## Build Output
- **Frontend**: `.next/` directory (Next.js build)
- **Backend**: `target/` directory (Rust build)
- **Database**: Generated migration files
- **Docker**: Container images for each service