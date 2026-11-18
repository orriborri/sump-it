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
