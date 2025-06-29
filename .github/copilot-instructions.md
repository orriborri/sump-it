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

## Testing Guidelines

### Testing Philosophy

**Write tests that focus on WHAT the software does (behavior and outcomes), not HOW it does it (implementation details).**

#### Core Testing Principles

1. **Test User Outcomes, Not Implementation**
   - Focus on user stories and business value
   - Test what users can accomplish, not internal function calls
   - Verify end-to-end workflows and user experiences

2. **Co-locate Tests with Code**
   - Place test files directly next to the code they test
   - Use `.test.ts` or `.test.tsx` extensions
   - Keep tests close to facilitate maintenance and discoverability

3. **Mock Only External Dependencies**
   - Mock database connections, external APIs, and third-party services
   - Avoid mocking internal business logic or components
   - Let your code run naturally to catch integration issues

4. **Use Meaningful Test Names**
   - Describe user value or business outcomes
   - Use "Given/When/Then" or user story format
   - Make test failures immediately understandable

### Test File Organization

```
app/
├── brew/
│   ├── components/
│   │   ├── BrewForm.tsx
│   │   └── BrewForm.test.tsx              # Component behavior tests
│   ├── brew-parameters/
│   │   ├── useRatioCalculation.ts
│   │   └── useRatioCalculation.test.ts    # Hook logic tests
│   ├── workflow/
│   │   ├── actions.ts
│   │   └── actions.test.ts                # Server action tests
│   └── business-logic.test.ts             # Pure business logic tests
```

### Types of Tests to Write

#### 1. Business Logic Tests (Pure Functions)
Test mathematical calculations, business rules, and data transformations.

```typescript
// ✅ Good - Tests coffee brewing math
describe('Coffee Brewing Calculations', () => {
  it('calculates correct water amount for given dose and ratio', () => {
    // Given: User wants 20g coffee at 1:16 ratio
    const dose = 20
    const ratio = 16

    // When: System calculates water needed
    const water = dose * ratio

    // Then: Should require 320ml water
    expect(water).toBe(320)
  })

  it('validates reasonable brewing parameters', () => {
    // Given: Typical brewing parameters
    const brew = { dose: 20, water: 320, ratio: 16, grind: 15 }

    // When: System validates parameters
    const isValid = validateBrewParameters(brew)

    // Then: Should accept reasonable values
    expect(isValid).toBe(true)
  })
})
```

#### 2. Component Behavior Tests
Test user interactions and component outcomes, not implementation details.

```typescript
// ✅ Good - Tests user workflow
describe('BrewForm - User Experience', () => {
  it('guides user through complete brewing setup', async () => {
    const user = userEvent.setup()
    
    render(<BrewForm beans={mockBeans} methods={mockMethods} />)

    // User Story: "As a coffee enthusiast, I want to set up my brew"
    
    // User selects their coffee beans
    await user.selectOptions(screen.getByLabelText(/bean/i), 'ethiopian-sidamo')
    
    // User sets coffee dose
    await user.type(screen.getByLabelText(/dose/i), '20')
    
    // System automatically calculates water (behavior, not implementation)
    expect(screen.getByDisplayValue('320')).toBeInTheDocument()
    
    // User can submit their brew setup
    await user.click(screen.getByRole('button', { name: /start brew/i }))
    
    // System processes the brew successfully
    await waitFor(() => {
      expect(screen.getByText(/brew started/i)).toBeInTheDocument()
    })
  })
})
```

#### 3. Hook Logic Tests
Test custom hooks behavior and state management.

```typescript
// ✅ Good - Tests hook behavior
describe('useRatioCalculation - Coffee Mathematics', () => {
  it('updates water calculation when dose changes', () => {
    const { result } = renderHook(() => 
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: User increases dose to 25g
    act(() => {
      result.current.updateDose(25)
    })

    // Then: Ratio should recalculate to maintain consistency
    expect(result.current.values.dose).toBe(25)
    expect(result.current.values.ratio).toBe(13) // 320ml ÷ 25g ≈ 13
  })
})
```



### Testing Best Practices

#### ✅ DO: Focus on User Value

```typescript
// ✅ Good - Tests what users care about
it('helps user achieve perfect coffee strength', async () => {
  // User wants stronger coffee
  await adjustRatio(12) // 1:12 ratio
  
  expect(getStrengthIndicator()).toBe('Strong')
  expect(getBrewGuidance()).toContain('rich and bold flavor')
})

// ❌ Bad - Tests implementation details
it('calls calculateWaterAmount with correct parameters', () => {
  component.setDose(20)
  expect(mockCalculateWaterAmount).toHaveBeenCalledWith(20, 16)
})
```

#### ✅ DO: Use Descriptive Test Names

```typescript
// ✅ Good - Describes user outcome
it('prevents submission with incomplete data and shows helpful guidance')
it('calculates water amount automatically when dose changes')
it('learns from user brewing history to improve suggestions')

// ❌ Bad - Describes implementation
it('calls validation function')
it('updates state when input changes')
it('queries database for previous brews')
```

#### ✅ DO: Test Error Scenarios

```typescript
// ✅ Good - Tests error handling
it('gracefully handles database connection failures', async () => {
  // Given: Database is unavailable
  mockDatabaseConnection.mockRejectedValue(new Error('Connection failed'))
  
  // When: User tries to save brew
  const result = await saveBrew(validBrewData)
  
  // Then: Should show helpful error message
  expect(result.success).toBe(false)
  expect(result.error).toContain('Unable to save')
})
```

#### ✅ DO: Test Edge Cases

```typescript
// ✅ Good - Tests boundary conditions
it('handles extreme brewing parameters appropriately', () => {
  // Very large dose (but not impossible)
  expect(validateDose(100)).toBe(true)
  
  // Unrealistic dose
  expect(validateDose(1000)).toBe(false)
  
  // Edge ratios
  expect(validateRatio(8)).toBe(true)   // Very strong
  expect(validateRatio(25)).toBe(true)  // Very weak
  expect(validateRatio(1)).toBe(false)  // Impossible
})
```

### Testing Utilities Setup

#### Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
})
```

#### Test Setup File
```typescript
// test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock external dependencies only
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
```

### Common Testing Patterns

#### User Event Testing
```typescript
// ✅ Good - Tests user interactions
const user = userEvent.setup()

// User fills out form
await user.type(screen.getByLabelText(/coffee dose/i), '20')
await user.selectOptions(screen.getByLabelText(/bean type/i), 'ethiopian')
await user.click(screen.getByRole('button', { name: /start brewing/i }))

// Verify user sees expected outcome
expect(screen.getByText(/brewing started/i)).toBeInTheDocument()
```

#### Async Testing
```typescript
// ✅ Good - Proper async testing
it('saves brew and shows success message', async () => {
  await user.click(saveButton)
  
  await waitFor(() => {
    expect(screen.getByText(/brew saved successfully/i)).toBeInTheDocument()
  })
})
```

#### Data Testing
```typescript
// ✅ Good - Tests data transformations
it('converts database strings to numbers for calculations', () => {
  const dbBrew = { dose: '20', ratio: '16' } // Database returns strings
  const calculated = calculateWaterAmount(dbBrew)
  
  expect(calculated.water).toBe(320) // Should be number
  expect(typeof calculated.water).toBe('number')
})
```

### What NOT to Test

#### ❌ Avoid Testing Implementation Details

```typescript
// ❌ Bad - Tests internal state
expect(component.state.isLoading).toBe(true)

// ❌ Bad - Tests function calls
expect(mockFunction).toHaveBeenCalledTimes(1)

// ❌ Bad - Tests CSS classes
expect(element.className).toContain('active')
```

#### ❌ Avoid Over-Mocking

```typescript
// ❌ Bad - Mocks internal logic
vi.mock('./useRatioCalculation')
vi.mock('./calculateWater')
vi.mock('./validateBrew')

// ✅ Good - Only mocks external dependencies
vi.mock('../lib/database')
vi.mock('next/navigation')
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test brew-logic.test.ts

# Run tests with coverage
pnpm test --coverage
```

### Test Maintenance

1. **Update tests when behavior changes** - not when implementation changes
2. **Keep tests simple and focused** - one concept per test
3. **Use test data builders** for complex objects
4. **Clean up mocks** in `beforeEach` blocks
5. **Group related tests** in `describe` blocks with clear names

### Example Test Structure

```typescript
describe('Coffee Brewing Feature', () => {
  describe('Ratio Calculations', () => {
    it('calculates water amount from dose and ratio')
    it('calculates ratio from dose and water amount')
    it('handles decimal ratios accurately')
  })

  describe('User Workflow', () => {
    it('guides user through complete brewing setup')
    it('prevents invalid submissions with helpful messages')
    it('saves successful brews with all parameters')
  })

  describe('Error Handling', () => {
    it('gracefully handles database failures')
    it('validates brewing parameters within reasonable ranges')
    it('provides helpful error messages for invalid inputs')
  })
})
```

This testing approach ensures your tests remain valuable even as you refactor implementation details, helping you build reliable, user-focused software.
