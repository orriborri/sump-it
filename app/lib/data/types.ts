import { ColumnType } from "kysely"

export type TableType<T> = {
  [K in keyof T]: T[K] extends ColumnType<infer S, unknown, unknown> ? S : T[K]
}