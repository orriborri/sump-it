/* v8 ignore start -- coverage: type-only barrel. Every statement below is an
   `export type` re-export of a ts-rs generated type; TypeScript erases them at
   compile time, so this file emits ZERO runtime JavaScript and has no coverable
   lines. It is kept out of the vitest `include` allow-list for the same reason
   (there is nothing to execute), and annotated here so the audit sees an
   explicit, reasoned exclusion rather than a silent omission (US44). */
// Re-exports the TypeScript types generated from the Rust models.
//
// The files under `lib/generated/` are produced by ts-rs (see the backend
// `cargo test export_bindings`); they are the single source of truth for the
// API contract and must never be edited by hand. Import generated types from
// this barrel so the rest of the frontend has one stable import path.
export type { CoffeeBean } from '../generated/CoffeeBean';
export type { CreateCoffeeBeanRequest } from '../generated/CreateCoffeeBeanRequest';
export type { BeanUsageRecord } from '../generated/BeanUsageRecord';
export type { Grinder } from '../generated/Grinder';
export type { CreateGrinderRequest } from '../generated/CreateGrinderRequest';
export type { GrinderType } from '../generated/GrinderType';
export type { BrewingMethod } from '../generated/BrewingMethod';
export type { BrewingSession } from '../generated/BrewingSession';
export type { CreateBrewingSessionRequest } from '../generated/CreateBrewingSessionRequest';
export type { SessionFilter } from '../generated/SessionFilter';
export type { PaginatedResponse } from '../generated/PaginatedResponse';
export type { ErrorResponse } from '../generated/ErrorResponse';
/* v8 ignore stop */
