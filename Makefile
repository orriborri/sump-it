# Coverage harness for the consolidated coffee brewing application.
#
# The single entry point is `make coverage`: it runs the backend and frontend
# test suites under their coverage gates and fails if either drops below the
# configured thresholds. See docs/coverage.md for the exclusion conventions.

# Toolchain the backend coverage gate runs on. cargo-llvm-cov requires a
# nightly toolchain (for the `coverage_nightly` cfg / `#[coverage(off)]`
# attribute and llvm-tools). Override with `make coverage RUST_NIGHTLY=nightly`
# once your environment's nightly compiles the dependency tree.
RUST_NIGHTLY ?= nightly

.PHONY: coverage coverage-backend coverage-frontend

# One command runs every test suite with coverage at 100% thresholds.
coverage: coverage-backend coverage-frontend
	@echo "All coverage gates passed."

# Backend: cargo-llvm-cov on the DB-free library (validation + models),
# enforcing 100% line coverage. RUSTFLAGS sets the `coverage_nightly` cfg so
# the `#[cfg_attr(coverage_nightly, coverage(off))]` bootstrap exclusions apply.
coverage-backend:
	cd backend && RUSTFLAGS="--cfg coverage_nightly" \
		cargo +$(RUST_NIGHTLY) llvm-cov --lib --fail-under-lines 100

# Frontend: Vitest + v8 coverage with 100% lines/branches/functions/statements.
coverage-frontend:
	cd frontend && npm run coverage
