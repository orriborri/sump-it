# 0001: Organize code by feature and avoid dependency cycles

- Status: Proposed
- Date: 2026-11-07
- Related: [Instruction log](../instruction-log.md#2026-11-07--development-practices), [PR #210](https://github.com/orriborri/sump-it/pull/210)

## Context

The backend is currently arranged mainly by technical layer; frontend features
also span `app/` and `lib/`. The requested development practices favor grouping
code by feature, avoiding cycles, and making features easier to remove. Next.js
routes, shared database migrations, and generated API types impose some
cross-feature locations.

## Options considered

- Keep the existing layer-first layout, avoiding migration but keeping feature
  changes spread across several directories.
- Move new and changed code toward feature modules incrementally, retaining
  shared infrastructure and framework-required wiring.
- Reorganize the whole application at once, reaching a uniform layout sooner
  but increasing the scope and risk of unrelated changes.

## Decision

Group feature-specific code and tests together as features are added or changed,
and avoid dependencies that form cycles. Keep Next.js routes in `app/` and
shared infrastructure, migrations, and generated contracts in their appropriate
shared locations. Migrate existing code incrementally, with regression coverage.
This improves locality without requiring a broad, unrelated rewrite.

## Consequences

- Feature behavior and tests become easier to find and change together.
- Some wiring and database history remain outside a feature's directory, so
  deleting the directory alone cannot always remove the entire feature.
- Existing split features can hide logical cycles from folder-based analysis;
  backend dependencies also need manual review until a suitable check exists.

## Verification

Run `cd frontend && npm run check:dependencies`; CI checks frontend module and
folder cycles, including type-only imports. Review cross-folder logical feature
dependencies and Rust dependencies manually. Run the relevant existing tests
when moving code and retain the coverage gates in `docs/coverage.md`.
