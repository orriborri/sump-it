# Code Standards

This documentation describes the naming conventions and folder structure we follow in our React application. The structure is derived from Domain-Driven Design (DDD) principles.

## Project Structure

```
/app
  /[feature]    # Feature-specific pages, components, and logic
  /lib          # Shared utilities and database types
  /common       # Shared components used across features
```

## Naming Conventions

### Files and Folders

- **Folders**: Use lower camel case

  - Examples: `src`, `brew`, `fooBar`

- **React Components**: Use upper camel case with `.tsx` extension

  - Examples: `Button.tsx`, `UserProfile.tsx`, `BrewForm.tsx`

- **JavaScript/TypeScript Files**: Use lower camel case

  - Examples: `utils.ts`, `database.ts`, `actions.ts`

- **Documentation**: Use spinal-case for Markdown files

  - Examples: `code-standard.md`, `api-docs.md`
  - Exception: `README.md` uses all capital letters

- **Configuration and Other Files**: Use lower camel case

  - Examples: `tailwind.config.js`, `tsconfig.json`

- **Test Files**: Match the naming of the file being tested
  - Examples: `Button.test.tsx`, `utils.test.ts`

### Component Organization

Components should be co-located with their feature in the appropriate `/app/[feature]` directory. Common components that are shared across features should be placed in the `/app/common` directory.

Example structure:

```
/app
  /brew
    page.tsx
    BrewForm.tsx
    actions.ts
  /common
    Button.tsx
    Select.tsx
```

## Coding Style

### TypeScript and Database Types

- Use TypeScript for all new code
- Leverage Kysely's type inference system:
  - Use Kysely-generated types from `db.d.ts` for database entities
  - Avoid creating custom types for database entities
  - Use `Selectable<Database["tableName"]>` for table row types
  - For query results, use `Awaited<ReturnType<typeof queryFunction>>`
- Define explicit types only for:
  - Props interfaces
  - Non-database types
  - Complex state objects
- Use type inference when the type is obvious
- Use arrow functions for callbacks
- Prefer using `const` for function declarations
- Avoid using `var` for variable declarations

Example of proper database typing:

```typescript
import type { DB } from "@/lib/db";
import type { Selectable } from "kysely";

// For direct table types
type Brew = Selectable<DB["brews"]>;

// For query results
type BrewResult = Awaited<ReturnType<typeof getBrews>>[number];

interface Props {
  brew: BrewResult;
  onChange: (value: string) => void;
}
```

### React Components

- Use functional components with hooks
- Export components as named exports
- Keep components focused and single-responsibility
- Place shared types in separate type files
- Use server components by default, only add "use client" when needed

### State Management

- Use React hooks for local state
- Prefer controlled components
- Keep state as close as possible to where it's used
- Use server actions for data mutations
- Implement proper loading and error states

### Database Operations

- Keep database queries in server-side code only
- Use Kysely for all database operations
- Implement proper error handling for database operations
- Use transactions when multiple operations need to be atomic
- Keep complex queries in dedicated action files

## Best Practices

1. **Component Organization**

   - One component per file
   - Co-locate related files (component, styles, tests)
   - Keep components small and focused

2. **Code Quality**

   - Use meaningful variable and function names
   - Write self-documenting code
   - Add comments for complex logic
   - Follow DRY (Don't Repeat Yourself) principles

3. **Performance**

   - Use React.memo for expensive computations
   - Avoid unnecessary re-renders
   - Implement proper error boundaries
   - Use proper data fetching patterns

4. **Accessibility**
   - Include proper ARIA attributes
   - Ensure keyboard navigation
   - Maintain proper heading hierarchy

## Version Control

- Write meaningful commit messages
- Keep commits focused and atomic
- Use feature branches for new development
- Review code before merging

## Documentation

- Document complex business logic
- Include JSDoc comments for public APIs
- Keep README files up to date
- Document configuration requirements
- Comment non-obvious code decisions

## Tooling

The project uses:

- TypeScript for type safety
- ESLint for code linting
- Next.js as the framework
- Material-UI for components
- Tailwind CSS for styling
- Kysely for database operations

Remember to run the appropriate checks before committing:

```bash
pnpm lint
pnpm type-check
```
