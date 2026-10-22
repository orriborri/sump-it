# Spec: AI SDLC loops

- Manually dispatch design, plan, build, fix and learn for a numbered GitHub issue.
- Plan requires accepted intent/spec in the default branch; build/fix require plan.
- Design/plan write Markdown only. Build iterates against existing contract/types
  and real Postgres coverage checks; publication requires independent verification.
- Review candidate diffs independently for bugs, security and spec conformance;
  report verdict tied to the exact head, with important/critical findings.
- Fix only an open same-repository AI build PR for the issue. Preserve existing
  tests, handle feedback with evidence or justified disagreement, then re-review.
- Publish with separate write credentials, validate scope and stale heads, and
  explicitly dispatch checks for bot-originated changes.
- Bound runs and exclude forks. Human reviewers merge artifacts/code; no deploy.
- Record incidents as lessons and proposed instruction improvements. Deterministic
  control regressions run in CI and weekly; document model eval/telemetry gaps.
- Document activation, credentials, protection settings and everyday operation.
