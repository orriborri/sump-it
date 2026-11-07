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
