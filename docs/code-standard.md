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

### Material UI Implementation

- Use Material UI components as building blocks for interfaces
- Follow Material Design principles for consistency and usability
- Customize components using theme.ts for project-wide styling
- Leverage the sx prop for component-specific styling
- Use theme tokens for colors, spacing, and typography
- Create custom component variants through the theme when needed
- Avoid direct CSS when MUI styling options are available
- Maintain accessibility when customizing MUI components

#### Material UI v7 Grid System

- Use the new Material UI v7 Grid component with the `size` prop:
  - `<Grid size={12}>` for full width (all 12 columns)
  - `<Grid size={6}>` for half width (6 of 12 columns)
  - `<Grid size={4}>` for one-third width (4 of 12 columns)
- For responsive layouts, use the appropriate breakpoint props:
  - `<Grid size={{xs: 12, sm: 6, md: 4}}>`
- Use `Grid container` for parent grid elements with appropriate spacing:
  - `<Grid container spacing={2}>`
- Do not use the deprecated `item` and standalone `xs/sm/md/lg` props from MUI v5

Example of proper Material UI v7 Grid implementation:

```tsx
import { Grid, Typography } from "@mui/material";

const GridExample = () => {
  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h4">Full Width</Typography>
      </Grid>
      <Grid size={6}>
        <Typography>Half Width</Typography>
      </Grid>
      <Grid size={6}>
        <Typography>Half Width</Typography>
      </Grid>
      <Grid size={{xs: 12, sm: 6, md: 4}}>
        <Typography>Responsive Width</Typography>
      </Grid>
    </Grid>
  );
};
```

Example of proper Material UI implementation:

```tsx
import { Box, Button, Typography } from "@mui/material";

const Component = () => {
  return (
    <Box sx={{ p: 2, bgcolor: "background.paper" }}>
      <Typography variant="h4" gutterBottom>
        Title
      </Typography>
      <Button variant="contained" color="primary" sx={{ mt: 2 }}>
        Action
      </Button>
    </Box>
  );
};
```

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

5. **Material UI Best Practices**
   - Use theme spacing consistently (theme.spacing(1) = 8px)
   - Use MUI's breakpoints for responsive design
   - Extend theme types for custom properties
   - Prefer MUI's Grid and Box for layout instead of custom CSS
   - Use Stack component for one-dimensional layouts
   - Leverage theme.palette for consistent color usage
   - For Grid components, always use the new `size` prop pattern
   - Use the `Paper` component for card-like containers with elevation

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
