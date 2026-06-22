import type { Selectable } from 'kysely'

/** Helper type that extracts the runtime (selectable) shape from a Kysely table type. */
export type RuntimeType<T> = Selectable<T>
