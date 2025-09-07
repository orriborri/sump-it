# Sump It - Coffee Brewing App AI Instructions

## Project Overview

**Sump It** is a Next.js 15 + TypeScript coffee brewing application with a unique **Integrated Vertical Stepper** design. The app guides users through a streamlined 2-step brewing workflow using PostgreSQL + Kysely for type-safe database operations.

## 🎯 Critical Architecture Knowledge

### Integrated Vertical Stepper System
This app's defining feature is a **custom vertical stepper** where form content appears directly between step numbers:

```
● 1. Select Bean & Brew    [Current Step]
    Step instructions (coffee-themed box)
    ┌─────────────────────────────────┐
    │        Form Content             │
    │    (Bean selector, dropdowns)   │
    └─────────────────────────────────┘
│
○ 2. Brewing Parameters
    (Combined: Recipe + Grind + Dosing)
```

**Key Files:**
- `app/brew/Step.tsx` - Main container (max-width 800px)
- `app/brew/IntegratedVerticalStepper.tsx` - Core stepper component
- `app/brew/CombinedBrewingParameters.tsx` - Step 2 combined form

**Design Rules (NEVER violate):**
- Single vertical column layout only
- Coffee brown primary color (#8B4513)
- Only current step shows form content (progressive disclosure)
- Form content integrated between step numbers
- 300ms smooth transitions

### Database Architecture with Generated Models

Uses **Kysely** query builder with **auto-generated TypeScript models**:

```typescript
// Generated models provide full CRUD + joins
import { BrewsModel, BrewsJoinedQueries } from '../lib/generated-models'

const brewsModel = new BrewsModel(db)
const brewsJoined = new BrewsJoinedQueries(db)

// Type-safe operations
const brew = await brewsModel.create({ bean_id: 1, method_id: 2 })
const withDetails = await brewsJoined.findByParameters(1, 2, 3)
```

**Critical Workflow Commands:**
```bash
pnpm run migrate               # Run database migrations
pnpm run generate:db-types     # Generate Kysely types from DB
pnpm run generate:models       # Generate model classes from types
```

**Important:** Database `Numeric` columns are stored as strings but used as numbers in calculations. Always convert: `Number(brew.ratio) || 0`

### Server Actions Pattern (No API Routes)

All data operations use **Next.js Server Actions** instead of API routes:

```typescript
// app/brew/actions.ts
'use server'

import { db } from '../lib/database'

export async function saveBrew(data: FormData) {
  try {
    const result = await brewsModel.create(data)
    revalidatePath('/brew')
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: 'Failed to save brew' }
  }
}
```

All server actions return structured responses: `{ success: boolean, error?: string, data?: T }`

### Testing Architecture

Uses **Vitest + @testing-library/react** with SQLite for testing:

```typescript
// Tests focus on user behavior, not implementation
describe('Coffee Brewing Workflow', () => {
  it('guides user through complete brewing setup', async () => {
    const user = userEvent.setup()
    render(<BrewForm />)
    
    // Test user journey, not internal functions
    await user.selectOptions(screen.getByLabelText(/bean/i), 'ethiopian')
    await user.type(screen.getByLabelText(/dose/i), '20')
    
    expect(screen.getByDisplayValue('320')).toBeInTheDocument() // 20g * 16 ratio
  })
})
```

**Test Database:** Uses in-memory SQLite with `createTestDatabase()` helper

### Development Commands

```bash
# Essential workflow
pnpm dev                    # Development server
pnpm run type-check         # TypeScript checking (run before commits)
pnpm test                   # Run tests
pnpm run docker:compose     # Full stack with PostgreSQL

# Database operations
pnpm run setup              # Run migrations + generate all types/models
pnpm run migrate            # Run pending migrations
pnpm run generate-all       # Regenerate all types and models

# Docker commands
pnpm run docker:compose     # Start with PostgreSQL
pnpm run docker:compose:down # Stop services
```

### File Structure Patterns

```
app/brew/                          # Main feature
├── Step.tsx                       # Stepper container
├── IntegratedVerticalStepper.tsx  # Core stepper component  
├── BeanSelector.tsx               # Step 1 content
├── CombinedBrewingParameters.tsx  # Step 2 content
├── actions.ts                     # Server actions
├── types.ts                       # Feature types
├── brew-parameters/               # Sub-components
│   ├── GrindSettingInput.tsx     # Grind setting component
│   └── WaterDoseInputGroup.tsx   # Water dosing component
└── services/                      # Business logic
    └── grindRecommendations.ts   # AI recommendations

app/lib/
├── database.ts                    # Kysely database connection
├── db.d.ts                        # Generated Kysely types (DO NOT EDIT)
└── generated-models/              # Auto-generated model classes
    ├── Brews.ts                   # CRUD operations
    ├── BrewsJoined.ts            # Complex queries with joins
    └── index.ts                   # Model exports
```

### Import Hierarchy Rules

**CRITICAL:** Follow the **downward dependency rule** - files should only import from:
- Same level (sibling files)
- Lower levels (subdirectories)
- **NEVER** import from parent or higher levels

```typescript
// ✅ GOOD - Same level imports
import { FormData } from './types'
import { BeanSelector } from './BeanSelector'

// ✅ GOOD - Downward imports (parent → child)
import { GrindSettingInput } from './parameters/GrindSettingInput'
import { useGrinderSettings } from './equipment/useGrinderSettings'

// ❌ BAD - Upward imports (child → parent)
import { Step } from '../Step'           // parameters/ → brew/
import { actions } from '../../actions'  // parameters/water-dose/ → brew/

// ✅ GOOD - Shared utilities from lib
import { db } from '../../lib/database'
```

**Why this matters:**
- Prevents circular dependencies
- Makes refactoring safer
- Creates clear architectural layers
- Enables domain boundaries

### Material-UI v7 Patterns

Uses MUI v7 with coffee theme and new Grid system:

```typescript
// Coffee theme colors
sx={{ 
  bgcolor: 'primary.main',        // #8B4513 (coffee brown)
  color: 'success.main'           // #4CAF50 (green)
}}

// New MUI v7 Grid pattern
<Grid container size={{ xs: 12, md: 6 }}>
  <Grid size={8}>Content</Grid>
</Grid>

// Responsive Stack patterns
<Stack 
  direction={{ xs: 'column', sm: 'row' }}
  spacing={2}
>
```

## 🚫 Critical Don'ts

1. **Never modify** `app/lib/db.d.ts` - it's auto-generated
2. **Never use API routes** - use Server Actions only  
3. **Never break the vertical stepper design** - it was specifically requested
4. **Never manually create index files** - use direct imports (exception: auto-generated files like `app/lib/generated-models/index.ts` are allowed)
5. **Never change coffee theme colors** without strong justification
6. **Never import upward** - only import from same level or subdirectories, never from parent directories

## 🔧 Common Tasks

**Add new form field:**
1. Update `types.ts` interface
2. Add field to relevant component
3. Update validation in server action

**Add database column:**
1. Create new migration file
2. Run `pnpm run migrate`
3. Run `pnpm run generate:db-types`
4. Run `pnpm run generate:models`

**Debug stepper issues:**
- Check that only current step shows content (`isActive` condition)
- Verify smooth transitions (300ms)
- Ensure coffee theme colors are consistent
- Test mobile responsive behavior

This architecture enables rapid development while maintaining type safety, design consistency, and excellent user experience through the integrated vertical stepper pattern.

## 📋 Quick Reference

### Essential Files to Know
- `app/brew/Step.tsx` - Main stepper orchestration
- `app/brew/IntegratedVerticalStepper.tsx` - Core stepper with coffee theme
- `app/lib/database.ts` - Kysely connection
- `migrations/` - Database schema evolution
- `generate-models.ts` - Model class generator

### Coffee Theme Colors
```css
Primary (Coffee Brown): #8B4513
Success (Green): #4CAF50
Grey (Inactive): #9E9E9E
```

### Data Flow Pattern
```
Database Migration → Type Generation → Model Generation → Server Actions → Components
```

The integrated vertical stepper and type-safe database patterns are the core architectural decisions that drive this application's design and development workflow.
