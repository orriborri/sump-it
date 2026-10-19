# Coverage gate

The project enforces **100% coverage from day one**. A single command runs
every test suite under its coverage gate:

```sh
make coverage
```

This runs two gates, both of which must stay at 100%:

| Area     | Tool                     | Thresholds                                   | Scope today                                    |
| -------- | ------------------------ | -------------------------------------------- | ---------------------------------------------- |
| Backend  | `cargo-llvm-cov` (nightly) | `--fail-under-lines 100`                     | library crate: `validation` + `models`         |
| Frontend | Vitest + `@vitest/coverage-v8` | 100% lines, branches, functions, statements | files listed in `vitest.config.ts` `include`   |

`make coverage` is the only command you need; `make coverage-backend` and
`make coverage-frontend` run the halves individually.

## Why the backend gate targets the library

The backend is split into a library crate (`backend/src/lib.rs`, exposing
`validation` and `models`) and a binary (`backend/src/main.rs`, plus `api`,
`services`, `database`). The library holds the database-independent domain
logic that is unit-testable without a running Postgres, so the gate runs with
`cargo llvm-cov --lib` and holds that core at 100% line coverage.

The database-backed handlers, services, and the server bootstrap live in the
binary. They are exercised by the integration-test tickets that introduce a
running database; those tickets extend the harness to the binary/integration
layer. Nothing is excluded with a path filter on the Rust side — the split is
structural, not a coverage opt-out.

## Exclusion convention

**Exclusions are inline only.** The single exception is generated code, which
is excluded by path (see below). Every inline exclusion is paired with a
comment beginning `coverage:` that states the reason.

### Rust

Mark a bootstrap/wiring item with the `coverage(off)` attribute, gated on the
`coverage_nightly` cfg so ordinary stable builds are unaffected:

```rust
// coverage: process bootstrap - creates the Postgres pool and runs migrations
// at startup; requires a live database and is wiring, not domain logic.
#[cfg_attr(coverage_nightly, coverage(off))]
pub async fn init_pool() -> Result<PgPool> { /* ... */ }
```

The `coverage_nightly` cfg is set by the coverage command
(`RUSTFLAGS="--cfg coverage_nightly"`, see the `Makefile`) and registered in
`backend/Cargo.toml` under `[lints.rust]` so builds stay warning-free. The
crate roots enable the attribute with
`#![cfg_attr(coverage_nightly, feature(coverage_attribute))]`.

Real examples in the tree: `main()` (`backend/src/main.rs`) and
`database::init_pool()` (`backend/src/database.rs`).

### TypeScript

Use the v8 ignore pragmas, each paired with a `coverage:` reason:

```ts
/* v8 ignore start -- coverage: defensive guard against a divide-by-zero that
   the brewing form's validation already prevents. */
if (coffeeGrams <= 0) {
  return '1:0.0';
}
/* v8 ignore stop */
```

`/* v8 ignore next */` works for a single following line; use
`start`/`stop` for a block. Real example: `formatCoffeeRatio` in
`frontend/lib/format.ts`.

### Generated code (the only path-based exclusion)

The TypeScript types under `frontend/lib/generated/**` are produced by ts-rs
from the Rust models (`cd backend && cargo test export_bindings`). They are a
build artifact, never hand-edited, and are excluded by path in
`vitest.config.ts` (`coverage.exclude`). This is the single config-level
exclusion; do not add others.

## Allowed exclusion reasons

Inline exclusions are only for:

- process bootstrap / wiring (server start, env load, pool creation);
- defensive, genuinely-unreachable branches;
- the root layout / provider shell.

**Never** exclude domain logic, validation, error mapping, request handlers, or
database queries. If something in those categories is hard to cover, write the
test (or, for DB-backed code, defer it to the integration-test ticket) rather
than excluding it.

## Growing the gate

- **Frontend:** `vitest.config.ts` `coverage.include` is an explicit allow-list.
  When a ticket adds a tested module, add its path to `include` in the same PR
  so new code is never silently left uncovered.
- **Backend:** as DB-backed code gains integration tests, extend the harness
  (e.g. a `--bin`/integration profile with a test database) rather than
  loosening the library gate.

## Sandbox / CI toolchain note

`cargo-llvm-cov` requires a nightly toolchain with `llvm-tools-preview`, plus
`cargo install cargo-llvm-cov`. The backend gate compiles the full dependency
tree (including `sqlx`) even though it only measures the DB-free `--lib` core,
so the nightly has to sit inside a compatibility window:

- A very recent nightly fails to compile `sqlx-postgres 0.7.4` (a Rust
  type-inference change around the `!` never type, rust-lang#148922).
- A too-old nightly (before ~2025-06) cannot build newer transitive
  dependencies that need `edition2024` (`icu_properties_data`) or the
  stabilized AVX-512 intrinsics (`zerocopy`'s `simd` feature).

The Makefile therefore pins a dated nightly that satisfies both ends. Install
it and run the gate:

```sh
rustup toolchain install nightly-2025-10-01 --component llvm-tools-preview
make coverage                      # uses RUST_NIGHTLY=nightly-2025-10-01 by default
```

Override the pin when your environment supplies a different compatible
nightly:

```sh
make coverage RUST_NIGHTLY=<toolchain>
```

Ordinary `cargo build`/`cargo test` on stable are unaffected; the nightly is
only needed for the coverage instrumentation.
