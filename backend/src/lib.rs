//! Library crate for the consolidated coffee brewing backend.
//!
//! This crate exposes the database-independent, unit-testable core of the
//! backend: domain validation (`validation`) and the domain models with their
//! pure business logic (`models`). The binary target (`main.rs`) depends on
//! this library and adds the process wiring (HTTP server, database pool) and
//! the database-backed API handlers and services.
//!
//! Coverage policy (see `docs/coverage.md`): the coverage gate for this crate
//! runs against the library (`cargo llvm-cov --lib`) and enforces 100% line
//! coverage over this DB-free core. Database-backed handlers, services, and
//! the server bootstrap live in the binary target and are covered by the
//! integration-test tickets that introduce a running Postgres.

// Enable the `#[coverage(off)]` attribute when the coverage harness sets the
// `coverage_nightly` cfg (wired in the llvm-cov invocation). On any other
// build this attribute is simply not applied, so stable builds are unaffected.
#![cfg_attr(coverage_nightly, feature(coverage_attribute))]

pub mod models;
pub mod recipe;
pub mod session_query;
pub mod validation;
