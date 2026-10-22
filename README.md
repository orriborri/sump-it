# Coffee Brewer - Consolidated Application

A comprehensive coffee brewing tracker application combining the best features from three separate repositories into a unified TypeScript frontend + Rust backend with a typed REST contract (TypeScript types generated from the Rust models via ts-rs).

## 🚀 Project Overview

This application consolidates three separate coffee brewing applications:
- **BeanIt**: Rust backend + Next.js frontend with type-safe APIs
- **sump-it**: Unique vertical stepper UI workflow with integrated forms  
- **rustyCoffy**: Comprehensive business logic layer with advanced validation

## 🏗️ Architecture

```
coffee-brewer-consolidated/
├── backend/              # Rust backend (Axum REST API)
│   ├── src/
│   │   ├── api/         # Axum route handlers
│   │   ├── models/      # Domain models with validation
│   │   ├── services/    # Business logic layer
│   │   ├── database/    # Database operations
│   │   └── validation/  # Comprehensive validation logic
│   ├── migrations/      # SQLx migrations (schema source of truth)
│   └── Cargo.toml
│
├── frontend/            # Next.js 15 frontend (typed fetch client)
│   ├── app/
│   │   ├── brew/        # Vertical stepper brewing workflow
│   │   ├── beans/       # Bean management
│   │   ├── grinders/    # Grinder management
│   │   └── sessions/    # Brew session history
│   ├── lib/
│   │   ├── trpc/        # Thin typed REST client over fetch (dir name historical; ts-rs generated types)
│   │   └── utils/       # Shared utilities
│   └── package.json
│
├── shared/              # Shared types and utilities
│   └── types/          # TypeScript types shared between frontend/backend
│
├── docker-compose.yml   # Development environment
├── .env.example         # Environment variables
└── package.json         # Root package for monorepo scripts
```

## ✨ Key Features

### 🔄 From sump-it
- **Integrated Vertical Stepper**: Unique 3-step brewing workflow
- **Coffee-themed UI**: Brown (#8B4513) and green (#4CAF50) color scheme
- **Progressive Disclosure**: Only current step shows form content
- **AI-powered Suggestions**: Brewing recommendations based on history
- **Previous Brew Feedback**: Integrated into parameter selection

### 🔒 From rustyCoffy  
- **Comprehensive Validation**: Database-level and application-level validation
- **Business Logic Layer**: Advanced service layer with connection pooling
- **Advanced Filtering**: Session filtering by origin, date ranges, ratings
- **Bean Inventory Management**: Automatic quantity tracking and decrementing
- **Session Duplication**: Easy reproduction of successful brews

### 🔧 From BeanIt
- **Type Safety**: Full TypeScript/TypeScript type safety
- **Generated Type Contract**: End-to-end type-safe APIs via ts-rs-generated TypeScript types
- **Modern Tooling**: Development with modern Rust/TypeScript stack
- **OpenAPI Support**: Optional OpenAPI documentation generation

## 🛠️ Tech Stack

### Backend
- **Rust** with Axum web framework
- **ts-rs** to generate TypeScript types from the Rust models for a type-safe API contract  
- **SQLx** with PostgreSQL (schema managed by SQLx migrations in `backend/migrations/`)
- **Docker** for containerization
- **OpenTelemetry** for observability

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Thin typed REST client** (`lib/trpc/client.ts`) for type-safe API calls using the ts-rs-generated types (the `trpc/` directory name is historical; there is no tRPC server, just a typed `fetch` wrapper)
- **Material-UI** with custom coffee theme
- **Zod** for form validation

## 📋 Core Entities

1. **Coffee Beans**
   - Name, origin, roast date, purchase date
   - Remaining quantity tracking
   - Variety and processing method

2. **Grinders**
   - Brand, model, type (Manual/Electric)
   - Setting ranges (min/max/step)
   - Grinder type (BurrConical, BurrFlat, Blade, Manual)

3. **Brewing Methods**
   - V60, Chemex, French Press, AeroPress, Espresso, etc.
   - Custom method creation

4. **Brewing Sessions**
   - Complete parameter tracking
   - Ratings (1.0-10.0 in 0.5 increments)
   - Tasting notes and feedback
   - Coffee/water ratio validation (per-method ratio bands via `rules_for` in `backend/src/recipe.rs`)

## 🚦 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ 
- Rust 1.70+

### Development Setup
1. Clone and navigate to project:
   ```bash
   cd coffee-brewer-consolidated
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   ```

3. Start development environment:
   ```bash
   docker-compose up -d
   ```

4. Run database migrations:
   ```bash
   cd backend && cargo run --bin migrate
   ```

5. Start backend:
   ```bash
   cd backend && cargo run
   ```

6. Start frontend:
   ```bash
   cd frontend && npm run dev
   ```

## 📊 Database Schema

The application uses PostgreSQL with:
- Custom enum types for brewing methods and grinder types
- CHECK constraints for validation rules
- Foreign key relationships for data integrity
- Indexes for performance on frequently queried fields

## 🧪 Testing Strategy

- **Unit Tests**: Core business logic and validation
- **Integration Tests**: API endpoints and database operations
- **Property-based Tests**: Validation logic edge cases
- **Mutation Tests**: Test suite completeness
- **E2E Tests**: Full user workflows

## 🚀 Deployment Options

1. **Docker Compose**: Simple containerized deployment
2. **Kubernetes**: Production-ready orchestration
3. **Railway/Vercel**: Platform-as-a-service options
4. **Traditional VPS**: Manual deployment on cloud providers

## 🔄 Development Workflow

1. **Type Safety**: All changes automatically validated by TypeScript and Rust
2. **Typed Contract**: End-to-end type safety between frontend and backend via ts-rs-generated types consumed by a thin typed fetch client
3. **Auto-generation**: TypeScript types generated from Rust models
4. **Hot Reload**: Both frontend and backend support hot reload

## 📈 Future Enhancements

1. **Mobile Apps**: React Native/iOS/Android applications
2. **Community Features**: Share recipes and brewing techniques
3. **Machine Learning**: Advanced brewing recommendations
4. **IoT Integration**: Connect to smart scales and temperature controllers
5. **Export/Import**: Share brewing data across devices

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgements

- Coffee Machine icon by Creative Stall from Noun Project (CC BY 3.0)
- All three original application authors for their innovative approaches
- The coffee brewing community for inspiration and feedback