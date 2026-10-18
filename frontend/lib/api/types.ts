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
