# Next.js TypeScript Project Guidelines

## Project Architecture

### File Structure

- Use **Domain-Driven Design (DDD)** with `/app/[feature]` structure
- `/app/common` for reusable components across features
- `/app/lib` for shared utilities, database types, and core logic
- Each feature should be self-contained with all files directly in the feature folder
- **Parent components should only import from children, never the reverse**
- Keep feature directories flat - no nested `components/` or `hooks/` folders

### Naming Conventions

- **Folders**: lowerCamelCase (`brew`, `brewParameters`, `userManagement`)
- **React Components**: PascalCase with `.tsx` extension (`BrewForm.tsx`, `ParameterVisualization.tsx`)
- **TypeScript files**: lowerCamelCase (`actions.ts`, `enhanced-actions.ts`, `types.ts`)
- **Hooks**: Start with `use` prefix (`useBrewWorkflow.ts`, `useRatioCalculation.ts`)
- **Server Actions**: `actions.ts` files with `"use server"` directive

#### Detailed Naming Rules

**Variables & Functions:**

- **Variables**: lowerCamelCase (`brewData`, `grindSettings`, `isLoading`)
- **Functions**: lowerCamelCase with descriptive verbs (`calculateRatio`, `saveBrewFeedback`, `updateFormData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_GRIND_SETTING`, `DEFAULT_RATIO`, `API_ENDPOINTS`)
- **Types & Interfaces**: PascalCase (`BrewWithFeedback`, `ParameterSuggestion`, `FormData`)

**Component Naming:**

- Use descriptive, specific names (`BrewParameterForm` not `Form`)
- Avoid generic names like `Component`, `Item`, `Element`
- Use composition for clarity (`WaterDoseInputGroup`, `RatioInputGroup`)

**File Naming:**

- Match component names exactly (`BrewForm.tsx` exports `BrewForm`)
- Use kebab-case for multi-word non-component files (`brew-parameters/`, `user-settings/`)
- Server actions: `actions.ts` or `enhanced-actions.ts`
- Types: `types.ts` within each feature

**Database & API:**

- **Tables**: snake_case (`brew_feedback`, `grinder_settings`)
- **Columns**: snake_case (`overall_rating`, `coffee_amount_ml`)
- **No API Routes**: Use Server Actions instead of `/api/` endpoints

**Import Aliases:**

- Avoid single-letter aliases except for common patterns (`React` as `React`)
- Use descriptive aliases for long paths (`import { BrewsModel as Brews }`)
- No default imports - use named imports consistently

## Code Quality Standards

### TypeScript

- Use **strict TypeScript** - all types must be explicitly defined
- Create dedicated `types.ts` files for shared types within features
- Use proper interface definitions for API responses and database models
- Leverage generated types from database schema
- **NO index files** - use direct imports with explicit file paths

### Import Patterns

```typescript
// ✅ Good - Direct imports
import { BrewsModel } from '../../lib/generated-models/Brews'
import { BrewFeedbackModel } from '../../lib/generated-models/BrewFeedback'

// ❌ Bad - Index file imports
import { BrewsModel, BrewFeedbackModel } from '../../lib/generated-models'
```

### Database & Server Actions

- Keep all database operations in **server-side code only**
- Use **Kysely** for all database operations with proper typing
- Implement comprehensive error handling: `{ success: boolean, error?: string }`
- Use generated model classes for CRUD operations
- Server actions should return structured responses

#### Server Actions Best Practices

- Use `"use server"` directive at the top of server action files
- Server actions can be called directly from Server Components
- Server actions can be used in forms with `action` prop
- Always handle errors gracefully in server actions
- Use `revalidatePath()` or `revalidateTag()` after mutations
- Return structured data for consistent error handling
- **No API routes needed** - Server Actions replace traditional API endpoints

```typescript
// ✅ Good - Server Action Example (replaces API routes)
'use server'

import { db } from '../lib/database'
import { revalidatePath } from 'next/cache'

export async function createBrew(data: FormData) {
  try {
    const result = await db.insertInto('brews').values(data).execute()
    revalidatePath('/brew')
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: 'Failed to create brew' }
  }
}
```

### React Patterns

- Use **functional components with hooks** exclusively
- Use **server components by default**, only add `"use client"` when needed
- Implement proper loading and error states
- Use controlled components where possible
- Keep state as close as possible to where it's used

#### Single Responsibility Principle

- **One function should do one thing** - keep functions focused and atomic
- **Components should only handle rendering** - extract business logic to hooks
- **Hooks should encapsulate specific logic** - one hook per concern
- **Logic belongs outside components** - prefer hooks over component logic

#### Logic Separation

- **Extract business logic to custom hooks** (`useBrewWorkflow`, `useRatioCalculation`)
- **Components focus on UI/rendering** - minimal logic in component body
- **Functions should be pure when possible** - predictable inputs/outputs
- **Complex calculations in separate utility functions** or hooks

```typescript
// ✅ Good - Logic in hook
function useBrewCalculation(dose: number, ratio: number) {
  return useMemo(() => calculateWater(dose, ratio), [dose, ratio]);
}

function BrewForm() {
  const water = useBrewCalculation(dose, ratio);
  return <div>Water: {water}ml</div>;
}

// ❌ Bad - Logic in component
function BrewForm({ dose, ratio }) {
  const water = dose * ratio; // Logic should be in hook
  return <div>Water: {water}ml</div>;
}
```

#### Next.js Server Components

- **Default to Server Components** - components are server-rendered by default
- Only use `"use client"` directive when:
  - Component needs browser APIs (localStorage, window, etc.)
  - Component uses React hooks (useState, useEffect, etc.)
  - Component handles user interactions (onClick, onChange, etc.)
  - Component uses client-side libraries
- **Server Component Benefits**:
  - Faster initial page loads
  - Better SEO
  - Reduced client-side JavaScript bundle
  - Direct database access without API routes
  - No need for API endpoints - use Server Actions instead
- **Data Fetching in Server Components**:
  - Use async/await directly in server components
  - Fetch data at the component level where it's needed
  - No need for useEffect for data fetching
- **File Structure for Server Components**:
  - Place server actions in `actions.ts` files
  - Keep server components in feature directories
  - Use proper TypeScript types for server component props

### Material-UI Implementation

- Use Material-UI components as building blocks
- Follow Material Design principles for consistency
- Use `theme.ts` for project-wide styling customization
- Leverage the `sx` prop for component-specific styling
- Use **Material-UI v7 Grid system** with the new `size` prop pattern
- Prefer MUI's Grid, Box, and Stack components over custom CSS

## Component Organization

### Structure

- **One component per file** with the same name as the file
- Keep all feature files directly in the feature directory (no nested folders)
- Export components as **named exports**, not default exports
- **Keep components focused and single-responsibility** - one purpose per component
- **Extract complex logic to hooks** - components should primarily handle rendering

### Example Structure

```
app/
├── brew/
│   ├── BrewForm.tsx
│   ├── BrewWorkflow.tsx
│   ├── useBrewWorkflow.ts
│   ├── actions.ts
│   ├── enhanced-actions.ts
│   ├── types.ts
│   └── page.tsx
├── common/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Header.tsx
└── lib/
    ├── database.ts
    └── generated-models/
        ├── Brews.ts
        └── BrewFeedback.ts
```

## Data Type Handling

### Database Types

- Database `Numeric` types are stored as `string` but used as `number` in calculations
- Always convert with `Number(value)` or `Number(value) || 0` for calculations
- Use proper type guards for nullable values

### Example

```typescript
// ✅ Good - Proper type conversion
const avgRatio = Number(brew.ratio) || 0
const ratioCalc = Math.round(avgRatio * multiplier)

// ❌ Bad - Direct string arithmetic
const ratioCalc = brew.ratio * multiplier // Type error
```

## Error Handling

- Use try-catch blocks in server actions
- Return structured error responses
- Implement proper loading states and skeleton components
- Use error boundaries for component-level error handling

## Development Workflow

- Run `pnpm type-check` before committing
- Use meaningful commit messages and atomic commits
- Write self-documenting code with JSDoc for complex functions
- Document business logic and non-obvious decisions

## Performance & Best Practices

- Use `React.memo` for expensive computations
- Implement proper data fetching patterns
- Avoid unnecessary re-renders
- Use proper loading states and skeleton components
- Implement accessibility features (ARIA attributes, keyboard navigation)
