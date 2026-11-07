# Engineering practices

These practices apply to humans and agents working on Sumpit. The
[instruction log](instruction-log.md) records requests and later clarifications;
it starts on 7 November 2026 and does not claim to reconstruct earlier requests.

## Behavior-first development

For each behavior change, work in a small vertical slice:

1. Write a test of the requested behavior through an appropriate public
   interface. Run it and observe that it fails for the expected behavioral
   reason, rather than because of a broken setup or import.
2. Write the smallest change that makes the test pass and run it again.
3. Refactor with the tests green, then rerun the relevant tests. Repeat for the
   next behavior.

Tests should describe observable features and outcomes, not private methods or
incidental implementation details. Prefer the frontend's UI and typed client
interfaces and the backend's router or service interfaces where they express
the behavior. Record the red, green, and refactor evidence in the pull request.
This sequence takes precedence if a bundled workflow describes refactoring at a
different stage.

For documentation, configuration with no product behavior change, and pure
refactors, use meaningful checks appropriate to the change instead of inventing
a behavior test. Run the existing tests before and after a pure refactor. Follow
the coverage requirements in [coverage.md](coverage.md); add new frontend
application modules to its explicit coverage include list.

## Feature organization and dependencies

Keep code that changes together within a feature, with a small public interface.
For a route-based frontend feature, place its components, feature-specific
helpers, and their tests together under `frontend/app/<feature>/`; keep only
truly shared code in `frontend/lib/`. Next.js route files remain in `app/`.
For new backend features, prefer a feature module under `backend/src/` containing
its domain logic, API adapter, and service code, with shared infrastructure
outside it. Keep database migrations and generated API contracts in their
required shared locations.

The existing backend is organized by technical layer, and existing frontend
features can span `app/` and `lib/`. Move a feature toward this structure when
working on it, with regression coverage; avoid a risky, unrelated bulk move.
Ideally deleting a feature removes its folder, apart from necessary route
registration, schema migrations, and shared contracts.

Dependencies must not form cycles between modules or feature folders. Use
`cd frontend && npm run check:dependencies` to check both module and folder
cycles in `app/` and `lib/`, including type-only TypeScript imports. CI runs the
same check. Rust dependencies and cross-repository relationships are not covered
by this check. Because existing frontend features can span multiple folders,
folder-level cycle detection can also miss cycles between logical features.
Review those dependencies until the affected code is colocated.

## Commits and reviews

Make one commit per small, coherent step so the step can be reviewed or reverted
independently. For behavior changes, a step normally contains the passing test,
implementation, and refactoring for one slice; keep the relevant checks green.
Use descriptive commit messages. Preserve these commits when merging instead of
squashing them, unless the user explicitly asks otherwise.

For every request, append the request, relevant clarifications, decisions, and
links to the work in the [instruction log](instruction-log.md). Preserve earlier
entries and redact private or secret material. Use the pull request template to
record the verification and link the corresponding entry. CI requires each pull
request to append to the log and preserve its previous contents; reviewers must
still check that the entry is accurate.
