# Instruction log

This is the authoritative record of instructions and decisions for Sumpit
from 7 November 2026 onward. Add an entry for each request and subsequent
clarification, including requests from issues or conversations. Preserve the
original wording when practical; otherwise include an accurate summary and a
link to the source. Record the date, decisions, and links to the resulting work.
Append later changes rather than rewriting the original request, so superseded
decisions remain auditable. The latest explicit clarification governs when
instructions conflict.

This repository is public. Never commit credentials or private information;
redact them and link to an appropriately accessible source when available.
Older requests are not reconstructed here: consult their original issues,
pull requests, and commits. Record older instructions only when their source is
available; do not invent missing history.

## 2026-11-07 — Development practices

**Source:** User request and attached screenshot in this conversation.

**Request:** “Look at sumpit can make sure we follow these practices”

The screenshot asks for:

> Apply Kent Beck’s Canon TDD. And to keep in mind that you have to see the test
> fail the way you expect, then the code has to fix it, and not to forget to
> refactor. And, as in agile, tests verify features and behaviors, not code.
>
> Organize folders by feature, with no cycles (Robert C. Martin). Ideally,
> removing a feature means just deleting its folder.
>
> One commit per step. I used to do this to undo things when the AI got
> something wrong. (And now to audit.)
>
> And an instruction log, recording everything that has been asked for: the
> source of truth for everything.

**Implementation:** See [engineering practices](engineering-practices.md), the
[frontend dependency rules](../frontend/.dependency-cruiser.cjs), and the
[CI workflow](../.github/workflows/contract.yml), as well as the pull request
containing this entry.

## 2026-11-07 — ADR workflow

**Source:** User requests in this conversation.

**Requests:** “Should we document changes in adr under a docs adr? Is there any
good standards” and “Add this as a skill and somehow enforce it”.

**Implementation:** Use a reusable architecture-decision skill and the
[ADR workflow](adr/README.md), with a pull-request assessment checked in CI.
The first proposed decision records [feature-oriented modules and acyclic
dependencies](adr/0001-feature-modules-and-acyclic-dependencies.md).

## 2026-11-17 — Dependabot ADR assessment

**Source:** Independent review of this pull request.

**Finding:** Dependabot PRs generally do not include an `ADR:` line, so the ADR
workflow would fail them even when they do not modify architecture decisions.

**Decision:** Skip only the PR-body assessment for Dependabot PRs that make no
ADR changes. Preserve ADR path/numbering validation and require the normal
assessment whenever an ADR file changes.

**Implementation:** Updated the ADR workflow in this pull request.

## 2026-11-18 — Bean and grinder service validation

**Source:** [Issue #166](https://github.com/orriborri/sump-it/issues/166) and
[PR #208](https://github.com/orriborri/sump-it/pull/208).

**Request:** Enforce existing bean and grinder validation for all create and
update callers, not just HTTP callers. Preserve the API's validation status
codes and error messages; leave recipe and session validation unchanged.

**Implementation:** The services validate before database access using the
existing rules. HTTP adapters translate service errors into the existing
responses. Direct service tests cover invalid requests; database tests still
check the grinder constraints independently of the service.

**CI follow-up:** Addressed DeepSource documentation and test-style findings
without changing validation or weakening the test assertions.

## 2026-11-18 — Homelab deployment

**Request:** Run Sump-it in the homelab cluster.

**Implementation:** Build the current frontend and Rust API as separate
commit-tagged images in the existing public Sump-it package. Route browser
API requests under `/api` on the frontend origin. See
[ADR 0003](adr/0003-publish-frontend-and-backend-images.md).

## 2026-11-18 — Type-safe brewing method selection

**Source:** [Issue #169](https://github.com/orriborri/sump-it/issues/169) and
[PR #197](https://github.com/orriborri/sump-it/pull/197).

**Request:** Share one frontend brewing-method options list, restrict the form
field to a generated method or an unselected state, and remove the unchecked
cast in session request conversion. Leave backend recipe rules unchanged.

**Integration:** Resolve the stale branch against `main`, keeping its current
frontend dependencies, app shell, and unrelated documentation. Keep the
method metadata shared by brew selection and session history, and include it
in frontend coverage.

## 2026-11-18 — Brew layout Grid2 migration

**Source:** [Issue #174](https://github.com/orriborri/sump-it/issues/174) and
[PR #201](https://github.com/orriborri/sump-it/pull/201).

**Request:** Migrate brew equipment, parameters, and feedback to the current
Grid API without changing responsive breakpoints or the brewing workflow.

**Integration:** Keep the installed Material UI version and the lockfile from
`main`. Use `Grid2` sizing with the same column spans and breakpoints. Keep the
rating field's layout wrapper at the call site to address JSX nesting feedback.

## 2026-11-18 — Backend formatting gate

**Source:** [PR #207](https://github.com/orriborri/sump-it/pull/207)
(the remaining formatting work from #195) and the delivery-loop request.

**Request:** Close the backend formatting gap and enforce `cargo fmt --check`
in the contract job without weakening coverage.

**Integration:** Move the PR from the superseded #206 branch to `main`. Run
rustfmt on current sources, retain the recipe assertions and coverage threshold,
and leave the service validation and dependency upgrades already on `main` intact.
