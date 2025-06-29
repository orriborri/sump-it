# Testing Guidelines for Coffee Brewing Application

## Philosophy: Test Behavior, Not Implementation

**Write tests that focus on WHAT the software does (user outcomes and business value), not HOW it does it (internal function calls and implementation details).**

## Quick Reference

### Test File Organization
```
app/
├── brew/
│   ├── components/
│   │   ├── BrewForm.tsx
│   │   └── BrewForm.test.tsx              # Component behavior
│   ├── brew-parameters/
│   │   ├── useRatioCalculation.ts
│   │   └── useRatioCalculation.test.ts    # Hook logic
│   └── business-logic.test.ts             # Pure functions
```

### Commands
```bash
pnpm test                    # Run all tests
pnpm test:watch             # Watch mode
pnpm test:ui                # Visual test runner
pnpm test specific.test.ts  # Run specific file
```

## Test Types & Examples

### 1. Business Logic Tests (Pure Functions)
**Focus**: Mathematical calculations, business rules, data validation

```typescript
describe('Coffee Brewing Calculations', () => {
  it('calculates correct water amount for brewing ratio', () => {
    // Given: User wants 20g coffee at 1:16 ratio
    const dose = 20
    const ratio = 16

    // When: System calculates water needed
    const water = dose * ratio

    // Then: Should require 320ml water
    expect(water).toBe(320)
  })

  it('validates brewing parameters are within reasonable ranges', () => {
    // Given: Typical brewing setup
    const brew = { dose: 20, water: 320, ratio: 16 }

    // When: System validates parameters  
    const isValid = 
      brew.dose > 5 && brew.dose < 100 &&
      brew.ratio > 8 && brew.ratio < 25

    // Then: Should accept reasonable values
    expect(isValid).toBe(true)
  })
})
```

### 2. Component Behavior Tests
**Focus**: User interactions, form workflows, UI feedback

```typescript
describe('BrewForm - User Experience', () => {
  it('guides user through complete brewing setup', async () => {
    const user = userEvent.setup()
    
    render(<BrewForm beans={mockBeans} methods={mockMethods} />)

    // User Story: "I want to set up my coffee brewing parameters"
    
    // User selects coffee beans
    await user.selectOptions(screen.getByLabelText(/bean/i), 'ethiopian')
    
    // User sets dose amount
    await user.type(screen.getByLabelText(/dose/i), '20')
    
    // System calculates water automatically (behavior test)
    expect(screen.getByDisplayValue('320')).toBeInTheDocument()
    
    // User can start brewing
    await user.click(screen.getByRole('button', { name: /start brew/i }))
    
    // System confirms brew started
    await waitFor(() => {
      expect(screen.getByText(/brewing started/i)).toBeInTheDocument()
    })
  })

  it('prevents invalid submissions with helpful guidance', async () => {
    const user = userEvent.setup()
    render(<BrewForm beans={[]} methods={[]} />)

    // User tries to submit empty form
    await user.click(screen.getByRole('button', { name: /start/i }))

    // System shows helpful validation
    expect(screen.getByText(/please select.*bean/i)).toBeInTheDocument()
    expect(screen.getByText(/brewing method.*required/i)).toBeInTheDocument()
  })
})
```

### 3. Hook Logic Tests
**Focus**: State management, calculations, side effects

```typescript
describe('useRatioCalculation - Coffee Mathematics', () => {
  it('updates water amount when dose changes', () => {
    const { result } = renderHook(() => 
      useRatioCalculation({ dose: 20, ratio: 16, water: 320 })
    )

    // When: User changes dose to 25g
    act(() => {
      result.current.updateDose(25)
    })

    // Then: Ratio recalculates to maintain consistency
    expect(result.current.values.dose).toBe(25)
    expect(result.current.values.ratio).toBe(13) // 320ml ÷ 25g
  })

  it('maintains mathematical relationships between parameters', () => {
    const { result } = renderHook(() => 
      useRatioCalculation({ dose: 18, ratio: 15, water: 270 })
    )

    // When: User adjusts ratio
    act(() => {
      result.current.updateRatio(16)
    })

    // Then: Water amount updates to match
    expect(result.current.values.water).toBe(288) // 18g × 16
    expect(result.current.values.ratio).toBe(16)
  })
})
```

### 4. Server Action Tests
**Focus**: Data persistence, error handling, business rules

```typescript
describe('Brew Workflow Actions', () => {
  it('saves complete brew data successfully', async () => {
    // Given: User has configured all brewing parameters
    const completeBrew = {
      bean_id: 1,
      method_id: 1, 
      dose: 20,
      water: 320,
      grind: 15,
      ratio: 16
    }

    // When: User saves their brew
    const result = await saveBrew(completeBrew)

    // Then: System saves successfully and returns brew ID
    expect(result.success).toBe(true)
    expect(result.brew.id).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('handles database errors gracefully', async () => {
    // Given: Database connection fails
    const brew = { bean_id: 1, method_id: 1, dose: 20, water: 320 }
    
    // Mock database failure
    vi.mocked(db.insertInto).mockRejectedValue(new Error('Connection lost'))

    // When: System tries to save
    const result = await saveBrew(brew)

    // Then: Returns helpful error message
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unable to save brew')
  })
})
```

## Testing Patterns & Best Practices

### ✅ DO: Test User Outcomes

```typescript
// ✅ Good - Tests what users achieve
it('helps user achieve perfect coffee strength', async () => {
  await setRatio(12) // Strong ratio
  
  expect(getStrengthIndicator()).toBe('Strong')
  expect(getTastingNotes()).toContain('bold and rich')
})

// ❌ Bad - Tests implementation
it('calls calculateStrength with ratio parameter', () => {
  setRatio(12)
  expect(mockCalculateStrength).toHaveBeenCalledWith(12)
})
```

### ✅ DO: Use Descriptive Names

```typescript
// ✅ Good - Describes user value
'prevents submission with incomplete data and shows helpful guidance'
'calculates water amount automatically when dose changes'
'learns from previous brews to suggest improvements'

// ❌ Bad - Describes mechanics
'validates form fields'
'updates component state'
'calls API endpoint'
```

### ✅ DO: Test Edge Cases

```typescript
it('handles extreme brewing parameters appropriately', () => {
  // Very strong coffee (edge of reasonable)
  expect(validateRatio(8)).toBe(true)
  
  // Very weak coffee (edge of reasonable)  
  expect(validateRatio(25)).toBe(true)
  
  // Impossible ratios
  expect(validateRatio(1)).toBe(false)
  expect(validateRatio(100)).toBe(false)
})
```

### ✅ DO: Test Error Scenarios

```typescript
it('gracefully handles network failures during brew save', async () => {
  // Given: Network is unavailable
  mockNetworkRequest.mockRejectedValue(new Error('Network error'))
  
  // When: User tries to save brew
  const result = await saveBrew(validBrewData)
  
  // Then: Shows helpful offline message
  expect(result.success).toBe(false)
  expect(result.error).toContain('check your connection')
})
```

## What NOT to Test

### ❌ Avoid Implementation Details

```typescript
// ❌ Bad - Tests internal state
expect(component.state.isLoading).toBe(true)

// ❌ Bad - Tests function calls  
expect(mockCalculateWater).toHaveBeenCalledTimes(1)

// ❌ Bad - Tests CSS classes
expect(element).toHaveClass('brew-form--active')

// ✅ Good - Tests user-visible behavior
expect(screen.getByText(/calculating/i)).toBeInTheDocument()
expect(screen.getByDisplayValue('320')).toBeInTheDocument()
expect(screen.getByRole('button')).toBeEnabled()
```

### ❌ Avoid Over-Mocking

```typescript
// ❌ Bad - Mocks internal logic
vi.mock('./useRatioCalculation')
vi.mock('./calculateWater') 
vi.mock('./validateBrew')

// ✅ Good - Only mocks external dependencies
vi.mock('../lib/database')
vi.mock('next/navigation')
```

## Test Organization

### Describe Block Structure
```typescript
describe('Feature Name', () => {
  describe('User Workflows', () => {
    it('allows user to complete primary task')
    it('prevents invalid actions with helpful guidance') 
    it('saves progress and shows confirmation')
  })

  describe('Calculations & Logic', () => {
    it('calculates correct values for typical inputs')
    it('handles edge cases appropriately')
    it('validates inputs within business rules')
  })

  describe('Error Handling', () => {
    it('gracefully handles external failures')
    it('provides helpful error messages')
    it('maintains data integrity during failures')
  })
})
```

### Test Data Management
```typescript
// ✅ Good - Reusable test data
const createMockBrew = (overrides = {}) => ({
  bean_id: 1,
  method_id: 1,
  dose: 20,
  water: 320,
  ratio: 16,
  grind: 15,
  ...overrides
})

// Use in tests
const strongBrew = createMockBrew({ ratio: 12 })
const weakBrew = createMockBrew({ ratio: 20 })
```

## Common Testing Utilities

### User Event Testing
```typescript
const user = userEvent.setup()

// Form interactions
await user.type(screen.getByLabelText(/dose/i), '20')
await user.selectOptions(screen.getByLabelText(/bean/i), 'ethiopian')
await user.click(screen.getByRole('button', { name: /save/i }))

// Verify results
expect(screen.getByText(/saved successfully/i)).toBeInTheDocument()
```

### Async Testing
```typescript
// Wait for async operations
await waitFor(() => {
  expect(screen.getByText(/brew complete/i)).toBeInTheDocument()
})

// Wait for elements to disappear
await waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})
```

### Mock Setup
```typescript
beforeEach(() => {
  vi.clearAllMocks()
  
  // Set up successful default mocks
  vi.mocked(saveBrew).mockResolvedValue({ success: true, brew: { id: 123 } })
  vi.mocked(getBeans).mockResolvedValue(mockBeans)
})
```

## Example: Complete Test File

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrewForm } from './BrewForm'

// Mock external dependencies only
vi.mock('../workflow/actions', () => ({
  saveBrew: vi.fn(),
}))

describe('BrewForm - Coffee Brewing Experience', () => {
  const mockBeans = [
    { id: 1, name: 'Ethiopian Sidamo', roast_level: 'Light' },
    { id: 2, name: 'Colombian Supremo', roast_level: 'Medium' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(saveBrew).mockResolvedValue({ success: true, brew: { id: 123 } })
  })

  it('guides user through complete brewing workflow', async () => {
    const user = userEvent.setup()
    
    render(<BrewForm beans={mockBeans} methods={mockMethods} />)

    // User Story: "I want to set up and start a coffee brew"
    
    // User selects their beans
    await user.selectOptions(screen.getByLabelText(/bean/i), '1')
    
    // User sets brewing parameters
    await user.type(screen.getByLabelText(/dose/i), '20')
    
    // System shows calculated water amount
    expect(screen.getByDisplayValue('320')).toBeInTheDocument()
    
    // User starts brewing
    await user.click(screen.getByRole('button', { name: /start brew/i }))
    
    // System confirms brew saved
    await waitFor(() => {
      expect(screen.getByText(/brew started/i)).toBeInTheDocument()
    })
  })

  it('prevents invalid submissions with clear guidance', async () => {
    const user = userEvent.setup()
    render(<BrewForm beans={[]} methods={[]} />)

    // User tries to start without required selections
    await user.click(screen.getByRole('button', { name: /start/i }))

    // System provides helpful validation messages
    expect(screen.getByText(/please select.*bean/i)).toBeInTheDocument()
    expect(screen.getByText(/choose.*method/i)).toBeInTheDocument()
  })
})
```

## Debugging Tests

### Running Specific Tests
```bash
# Run single test file
pnpm test BrewForm.test.tsx

# Run tests matching pattern
pnpm test --grep "user workflow"

# Run with debugging
pnpm test --reporter=verbose

# Run with coverage
pnpm test --coverage
```

### Common Issues & Solutions

1. **"Element not found"** - Use `screen.debug()` to see rendered HTML
2. **"Test timeout"** - Add proper `waitFor()` for async operations  
3. **"Mock not called"** - Verify mock setup in `beforeEach()`
4. **"Type error"** - Ensure proper TypeScript types for test data

Remember: **Good tests give you confidence to refactor and improve your code while ensuring users can always accomplish their goals.**
