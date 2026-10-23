//! Library crate for the consolidated coffee brewing backend.
//!
//! This crate exposes the whole application surface that is worth testing: the
//! database-independent domain core (`validation`, `models`, `recipe`,
//! `session_query`) AND the database-backed layers that sit on top of it: the
//! service layer (`services`) that owns the SQL and transactions, and the axum
//! API handlers (`api`) that map requests/responses and errors to HTTP. Only
//! the process bootstrap (HTTP server start, env loading) and the pool creation
//! live in the binary target (`main.rs`) / `database.rs`.
//!
//! Keeping the handlers and services in the library (rather than the binary)
//! means a single `cargo llvm-cov` run over the integration tests - which drive
//! the real axum router and the real services against a live Postgres - measures
//! and gates every non-bootstrap line at 100% coverage.
//!
//! Coverage policy (see `docs/coverage.md`): domain logic, validation, error
//! mapping, handlers and queries are NEVER excluded. The only coverage-off lines
//! are inline-annotated process bootstrap/wiring (server start, env load, pool
//! creation) and defensive, by-construction-unreachable branches, each with a
//! one-line `coverage:` reason.

// Enable the `#[coverage(off)]` attribute when the coverage harness sets the
// `coverage_nightly` cfg (wired in the llvm-cov invocation). On any other
// build this attribute is simply not applied, so stable builds are unaffected.
#![cfg_attr(coverage_nightly, feature(coverage_attribute))]

pub mod api;
pub mod database;
pub mod models;
pub mod pagination;
pub mod recipe;
pub mod services;
pub mod session_query;
pub mod validation;
