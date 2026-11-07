# Architecture decision records

This project workflow takes precedence over conflicting ADR-format or
significance guidance in bundled skills, including the domain-modeling skill.

For every change, review the relevant records in this directory and decide
whether it introduces or changes a significant architectural decision. Record a
decision when its rationale or trade-offs will matter to a future maintainer:
for example, changes to module boundaries, data ownership, interfaces,
technology, or deployment. A routine change that follows existing decisions
does not need a new ADR.

Use one file per decision with four digits, a hyphen, then a lowercase name made
of letters or digits separated by single hyphens, for example
`0001-short-title.md`. Apart from this README, Markdown files in `docs/adr/`
follow that naming rule. Use a short MADR-inspired format with the following
exact headings so CI can check it:

```markdown
# 0001: Decision title

- Status: Proposed
- Date: YYYY-MM-DD
- Related: Issue, PR, instruction-log entry, or other ADR

## Context

The situation, problem, and constraints.

## Options considered

The actual options and relevant trade-offs.

## Decision

The choice and why it was made.

## Consequences

The benefits, costs, and limitations.

## Verification

How implementation or compliance can be checked.
```

Mark a decision `Proposed` while it is awaiting acceptance. Use `Accepted` once
it has been accepted through the project's review process. If an accepted
decision changes materially, create a new ADR and mark the old one superseded
with a link. Preserve the earlier reasoning; correct minor errors or clarify
details in place. Keep existing ADR files in place: CI rejects deleting or
renaming them so existing references and decision history remain available.
Record only alternatives and rationale supported by evidence.

## Pull requests

Every pull request must contain an assessment in its description: list each
relevant existing or new ADR on its own `ADR:` line, or use one `none` line
explaining why no ADR is needed. Every added or modified numbered ADR must be
listed, including records being marked superseded or deprecated:

```text
ADR: docs/adr/0001-feature-modules-and-acyclic-dependencies.md
```

```text
ADR: none - Corrects a typo without changing architecture.
```

CI requires an assessment: either a reason for `none` of at least eight
characters, starting with a letter or digit, or existing, nonempty ADRs with
the required headings and a `Proposed` or `Accepted` status. Changed ADRs may
also be marked `Deprecated` or `Superseded by` a replacement. Reviewers still
decide whether the assessment and ADR content are appropriate; the check cannot
infer architectural significance. The repository's branch rules must require
the `adr-assessment` check for a failure to block merging.

The [instruction log](../instruction-log.md) records the user's requests. ADRs
record significant decisions and their rationale, linking back to the request
and related work where available.
