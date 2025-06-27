import type { Selectable } from 'kysely'

// Helper type to get runtime types from Kysely types
export type RuntimeType<T> = Selectable<T>
