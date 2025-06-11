# File Structure for Next.js Application with TypeScript
Folder structure for a Next.js application with TypeScript, organized by app and common components.
we use `app` for the main application logic and `common` for reusable components.
each folder contains relevant files for its purpose, such as forms, types, and utility functions.
each component is structured to facilitate easy imports and maintainability.

Each component has one file per component, and utility functions are grouped logically.

Parrents should only import form children not the other way around.

```
app
|-- brew
|   |-- Form.tsx
|   |-- Step.tsx
|   |-- useForm.ts
|   |-- useFeedback.ts
|   |-- types.ts
|   |-- page.tsx
|-- page.tsx
|-- layout.tsx
common
|-- Button.tsx
|-- Input.tsx
|-- Header.tsx
lib
|-- db.ts

```

# 