# Coverage gate

The project enforces **100% coverage from day one**. A single command runs
every test suite under its coverage gate:

```sh
make coverage
```

This runs two gates, both of which must stay at 100%:

| Area     | Tool                     | Thresholds                                   | Scope today                                    |
| -------- | ------------------------ | -------------------------------------------- | ---------------------------------------------- |
| Backend  | `cargo-llvm-cov` (nightly) | `--fail-under-lines 100`                     | the WHOLE application: `validation`, `models`, `recipe`, `session_query` AND the DB-backed `services/*` and axum `api/*` |
| Frontend | Vitest + `@vitest/coverage-v8` | 100% lines, branches, functions, statements | files listed in `vitest.config.ts` `include`   |

`make coverage` is the only command you need; `make coverage-backend` and
`make coverage-frontend` run the halves individually.

> **The backend gate needs a live Postgres.** The DB-backed layers are measured
> by the integration tests, which run against the database named by
> `DATABASE_URL` (see "Running the backend gate" below). Export a reachable
> `DATABASE_URL` before `make coverage` / `make coverage-backend` so those
> tests actually exercise the DB-backed code.
>
> **Local footgun:** the `#[ignore]`d DB tests read `DATABASE_URL` (falling back
> to `TEST_DATABASE_URL`) and, when neither is set, their pool helper returns
> `None` and each test returns early instead of failing. So a local
> `make coverage-backend` with no database still *runs* the ignored tests but
> they no-op, leaving the DB-backed `services/*` and `api/*` lines uncovered.
> On a machine where those layers happen to be the only uncovered code the gate
> would drop below 100% and fail, but the skipped tests themselves report green,
> so always confirm a reachable `DATABASE_URL` locally. CI is safe: the
> `backend-coverage` job always provides a `postgres` service container, so the
> tests connect and the DB-backed lines are measured.

## What the backend gate covers

The backend is split into a library crate (`backend/src/lib.rs`) and a thin
binary (`backend/src/main.rs`). To get the spec-mandated 100% line coverage over
ALL non-bootstrap code in a single run, the library crate now exposes not only
the database-independent core (`validation`, `models`, `recipe`,
`session_query`) but also the DB-backed layers: the service layer
(`services/*`, which owns the SQL and the brew transaction) and the axum API
handlers (`api/*`, which map requests/responses and errors to HTTP). Only the
process bootstrap lives in the binary: `main()` (server start, tracing, env,
router/listener wiring) and `database::init_pool()` (pool creation + migrations).

Because the handlers and services are in the library, one invocation,

```sh
cargo llvm-cov --lib --tests --fail-under-lines 100 -- --include-ignored --test-threads=1
```

measures the library unit tests AND the DB integration tests under
`backend/tests/`, and gates the union at 100% lines. The integration tests drive
the real code end to end against Postgres:

- `tests/api_router_db.rs` builds HTTP requests and sends them through the REAL
  `api::router` in-process (`tower::ServiceExt::oneshot`), asserting on status
  and JSON. It covers every handler branch (success / validation / not-found /
  conflict / server-error), the single `save_error_response` error-mapping site,
  and the `Err(e) => 500` arms (forced by dropping tables so the service
  queries fail).
- `tests/session_logging_db.rs` and `tests/session_list_duplicate_db.rs` call
  the real `services::sessions::SessionService` directly, exercising the
  shipping INSERT/SELECT column lists, bind order and `FromRow` mapping. Two of
  them force the in-transaction error-mapping arms to execute: the decrement
  mapping (by dropping the column the `UPDATE` writes) and the commit mapping
  (by a deferred constraint trigger that fails only at `COMMIT`).
- `tests/bean_inventory_db.rs` and `tests/grinders_integration.rs` pin the
  schema behaviour.

Nothing is excluded with a path filter on the Rust side. The only coverage-off
lines are inline-annotated bootstrap/wiring (`main`, `health_check`,
`init_pool`) and a single defensive, by-construction-unreachable transaction
branch in `services/sessions.rs` (`begin_tx`, which only fails if the pool is
already dead), each with a `coverage:` reason. The brew transaction's
error-mapping on database queries - the inventory decrement and the commit, as
well as the bean lock and session insert - is ordinary covered code. Each
mapping site is forced to fail by a dedicated DB integration test: the bean
lock and session insert by dropping the relevant table mid-flight
(`api_router_db.rs`), the inventory decrement by
`decrement_query_failure_maps_to_database_error` (dropping the
`coffee_beans.updated_at` column the `UPDATE` writes), and the commit by
`commit_failure_maps_to_database_error` (a `DEFERRABLE INITIALLY DEFERRED`
constraint trigger that fires and raises only at `COMMIT`, after the in-tx
lock/insert/decrement have all succeeded) - both in `session_logging_db.rs`.

## Running the backend gate

The DB tests are `#[ignore]`d (so `cargo test` is clean without a database) and
read `DATABASE_URL` (falling back to `TEST_DATABASE_URL`). Point them at any
reachable Postgres 16 and run the gate in the same shell, e.g.:

```sh
export DATABASE_URL=postgres://postgres@127.0.0.1:5433/coffee_test
make coverage-backend            # or: make coverage
```

Each DB test either creates a uniquely named throwaway database or cleans up the
rows it inserts, so the suite is isolated and repeatable. `--test-threads=1`
keeps the shared-database suites deterministic.

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

Real examples in the tree: `main()` / `health_check()` (`backend/src/main.rs`),
`database::init_pool()` (`backend/src/database.rs`), and the defensive
transaction-wiring helper `begin_tx` (`backend/src/services/sessions.rs`),
which only fails if the pool is already dead.

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
- **Backend:** new handlers/services belong in the library crate (not the
  binary) and must ship with integration tests that drive them against Postgres,
  so they are picked up by the existing `--lib --tests` gate. Keep the binary
  limited to bootstrap/wiring.

## Sandbox / CI toolchain note

`cargo-llvm-cov` requires a nightly toolchain with `llvm-tools-preview`, plus
`cargo install cargo-llvm-cov`. The backend gate compiles the full dependency
tree (including `sqlx`) and measures the whole application (library core plus
the DB-backed handlers/services via the integration tests), so the nightly has
to sit inside a compatibility window:

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
