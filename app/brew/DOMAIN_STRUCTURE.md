# Brew Domain Structure

## Overview
The `/brew` folder has been reorganized using Domain-Driven Design principles to improve maintainability and code organization.

## Domain Structure

### 🔧 Equipment Domain (`/equipment/`)
**Purpose**: Grinder settings and equipment configurations
- `grinderActions.ts` - Server actions for grinder settings and configurations

### ⚖️ Parameters Domain (`/parameters/`)
**Purpose**: Brewing calculations, ratios, and parameter inputs
- `EnhancedRecipe.tsx` - Recipe configuration component
- `GrindSettingInput.tsx` - Simple grind setting input
- `ParameterVisualization.tsx` - Visual parameter displays
- `RatioInputGroup.tsx` - Simplified coffee ratio input controls
- `water-dose/` - Water dosing components and calculations
- `types.ts` - Parameter-specific types

### ⭐ Feedback Domain (`/feedback/`)
**Purpose**: Brew rating, evaluation, and feedback collection
- `BrewFeedback.tsx` - Basic feedback component
- `EnhancedBrewFeedback.tsx` - Advanced feedback component
- `types.ts` - Feedback-specific types

### 🔄 Workflow Orchestration (Root Level)
**Purpose**: UI orchestration and workflow coordination
- `IntegratedVerticalStepper.tsx` - Main stepper component
- `Step.tsx` - Step coordination and layout
- `BeanSelector.tsx` - Cross-domain bean/method/grinder selector
- `CombinedBrewingParameters.tsx` - Parameter orchestration
- `useBrewWorkflow.ts` - Workflow state management
- `Form.tsx`, `FormWrapper.tsx` - Form containers

### 📄 Shared Resources (Root Level)
**Purpose**: Cross-cutting concerns and shared utilities
- `types.ts` - Shared type definitions
- `constants.ts` - Application constants
- `schemas.ts` - Validation schemas
- `actions.ts` - Main brewing actions
- `page.tsx` - Main page component

## Design Principles

### ✅ Domain Separation
- Each domain contains both business logic AND its UI components
- Domains are self-contained with minimal cross-dependencies
- Clear separation of concerns between business domains

### ✅ Flat Structure
- Following GitHub documentation guidelines for flat feature directories
- No nested `components/` or `hooks/` folders within domains
- Direct file placement for easy discovery

### ✅ Import Patterns
- Direct imports with explicit file paths
- No index files to maintain clarity
- Domain-specific imports clearly show dependencies

## Benefits

1. **Maintainability**: Related code is co-located within domains
2. **Scalability**: Easy to add new features within existing domains
3. **Testability**: Domain-specific testing is more focused
4. **Understanding**: Clear business domain boundaries
5. **Refactoring**: Changes within domains have minimal external impact

## Migration Notes

All import paths have been updated to reflect the simplified structure:
- `brew-parameters/` → `parameters/`
- `grinderActions` → `equipment/grinderActions`
- Recipe components moved to `parameters/`
- Removed complex recommendation system for simplified UX

The reorganization maintains all essential functionality while improving code organization and maintainability.