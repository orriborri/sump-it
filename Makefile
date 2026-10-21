# Coverage harness for the consolidated coffee brewing application.
#
# The single entry point is `make coverage`: it runs the backend and frontend
# test suites under their coverage gates and fails if either drops below the
# configured thresholds. See docs/coverage.md for the exclusion conventions.

# Toolchain the backend coverage gate runs on. cargo-llvm-cov requires a
# nightly toolchain (for the `coverage_nightly` cfg / `#[coverage(off)]`
# attribute and llvm-tools). This is pinned to a dated nightly that compiles
# the full dependency tree: the latest `nightly` currently fails to build
# sqlx-postgres 0.7.4 (the `!` never-type inference change, rust-lang#148922),
# while nightlies older than ~2025-06 are too old for newer transitive deps
# (edition2024 / stabilized AVX-512 intrinsics). See docs/coverage.md. Override
# with `make coverage RUST_NIGHTLY=<toolchain>` when your environment differs.
RUST_NIGHTLY ?= nightly-2025-10-01

.PHONY: coverage coverage-backend coverage-frontend

# One command runs every test suite with coverage at 100% thresholds.
coverage: coverage-backend coverage-frontend
	@echo "All coverage gates passed."

# Backend: cargo-llvm-cov over the WHOLE application - the DB-free library core
# (validation, models, recipe, session_query) AND the DB-backed service layer
# (services/*) and axum handlers (api/*) - enforcing 100% line coverage in one
# run. The handlers/services live in the library crate, so `--lib --tests`
# measures both the library and the integration tests that drive the real axum
# router / services against Postgres. The DB tests are `#[ignore]`d, so
# `--include-ignored --test-threads=1` runs them serially against the live
# database named by DATABASE_URL (which MUST be exported and reachable; see
# docs/coverage.md). RUSTFLAGS sets the `coverage_nightly` cfg so the
# `#[cfg_attr(coverage_nightly, coverage(off))]` bootstrap/defensive exclusions
# apply.
coverage-backend:
	cd backend && RUSTFLAGS="--cfg coverage_nightly" \
		cargo +$(RUST_NIGHTLY) llvm-cov --lib --tests --fail-under-lines 100 \
		-- --include-ignored --test-threads=1

# Frontend: Vitest + v8 coverage with 100% lines/branches/functions/statements.
coverage-frontend:
	cd frontend && npm run coverage
