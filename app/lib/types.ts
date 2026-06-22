import type { Selectable } from 'kysely'

/**
 * Helper type that extracts the runtime (selectable) representation from a Kysely table type.
 * Use this to derive plain object types from Kysely schema definitions for use in
 * application logic outside of query builders.
 * @template T - A Kysely table interface type
 */
export type RuntimeType<T> = Selectable<T>
