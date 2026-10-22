# AI-native SDLC loops

Based on [Anthropic's AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).
GitHub Issues describe requests; merged change artifacts in this repository are
the authoritative intent, spec and plan. PRs retain review and verification evidence.
The existing `.kiro/skills/` stay the source for engineering guidance; the CI agent
reads their files directly rather than assuming they are installed slash commands.

## One-time activation

1. Merge the workflow PR. Add `ANTHROPIC_API_KEY` under repository Settings →
   Secrets and variables → Actions. Never put it in an issue or committed file.
2. In Settings → Actions → General, allow GitHub Actions to create pull requests.
   No personal access token or Claude GitHub App is required: these workflows
   supply the built-in GitHub token to the Claude action.
3. Create an environment named `ai-delivery`, restrict deployments to the default
   branch, and configure a required human reviewer. The environment is an approval
   for starting agent work, not a production deployment. GitHub may limit environment
   protection features by plan. Until configured, dispatch itself is the human gate.
4. Protect `main`: require human PR review, dismiss stale approvals, require the
   contract/backend/frontend gates, and prevent the Actions bot from bypassing it.
   Require the `ai-review` commit status if you want findings to block merging.
   The posting job publishes it on the exact candidate commit, even for dispatched runs.
5. Run `AI control checks`, then try `AI delivery loop` with a small issue and
   stage `design`. Validate a complete design → plan → build → fix cycle before
   relying on it for larger changes.

Credentials, environment protections and repository settings are not configured by
committing these files. Model/API execution needs the secret before its first run.

## Daily use

Open a GitHub issue with the problem, desired outcome and constraints. From
Actions → **AI delivery loop** → Run workflow, use the default branch and its
issue number:

| Stage | Input | Result / next human decision |
| --- | --- | --- |
| `design` | Issue number | PR with `docs/changes/<issue>/intent.md`, `spec.md`, `evidence.md`. Resolve concerns, review and merge. |
| `plan` | Same issue | Requires merged intent/spec; PR adds files, steps, risks, tests and rollback in `plan.md`. Review and merge. |
| `build` | Same issue | Requires merged intent/spec/plan; implements, tests, fixes, and independently verifies before opening a PR. |
| `fix` | Same issue + build PR number | Reads PR discussion, inline comments and failed check summaries. Updates the same branch, writes `review-response.md`, verifies and requests fresh CI/review. |
| `learn` | Incident or repeated-mistake issue | Proposes `lessons.md`, regression scenarios and evidence-based instruction updates. Human reviews before merging. |

Design and plan are separate reviewable changes. Merging their artifacts represents
acceptance, so do not merge documents with unresolved blocking questions. There is
no automatic transition from a model saying "approved" to implementation.

The build/fix agent can iterate locally, with a prompt limit of three complete
verification attempts, a hard 60-turn/$10 model limit, and a 60-minute job timeout.
Sonnet does delivery; Opus does independent review (25 turns/$5, 15 minutes).
These are per invocation limits, not a monthly budget. Failed verification prevents
publication. A blocked agent may leave an evidence-only proposal; read the evidence
before treating it as implemented. Workflow logs retain failed verification output.

PR creation and each update explicitly dispatch contract CI and independent review.
This is necessary because events produced by `GITHUB_TOKEN` do not trigger ordinary
push/PR workflows. Human pushes trigger those workflows normally. The review reads
the trusted base plus the candidate diff, never executes PR code, ties its verdict
to the reviewed head and fails on material findings or incomplete context.

When findings arrive, run `fix`. It can fix them or explain a disagreement with
evidence. It never marks human threads resolved. Every published revision gets a
fresh review. Fixes are deliberately **human-triggered**, not an unbounded bot
conversation; a failure or blocked finding returns control to you. Passing tests
do not imply semantic acceptance. Merge and production release remain human actions.

## Verification and boundaries

`bash scripts/ai-verify.sh` regenerates API types and detects drift, type-checks the
frontend, then runs `make coverage` against a reachable test Postgres. CI installs
Node 20, the existing pinned Rust nightly and cargo-llvm-cov. It uses the same
100% backend/frontend coverage gates as `contract.yml`. UI evidence must say when
visual verification is pending; a browser/screenshot service is not provisioned.

The model job has read-only GitHub permissions. A separate publisher job applies
only the verified artifact, revalidates scope/parent/branch, and pushes a normal
fast-forward. A concurrent branch update fails rather than overwriting it.
Agents may change source/tests and this issue's Markdown artifacts. They cannot
publish deletions, symlinks, workflows, scripts, dependency/configuration files,
migrations or lockfiles. Fix mode cannot edit existing test files or the trailing
Rust inline test sections; add new regression cases in separate test files. Such changes require
a human-authored PR. Learn mode can propose instruction/policy changes, subject to
review. Future changes to these boundaries are ordinary reviewed code changes.

Prompts and local guard scripts are engineering controls, not a security sandbox
against a hostile agent with shell access. Use GitHub-hosted disposable runners,
no production credentials, and trusted tasks. A separate hardened worker/service
is needed before processing arbitrary untrusted requests. Fork PRs are excluded
from the model workflows. Never use `pull_request_target` to run candidate code.

## Feedback and evaluation

`AI control checks` runs deterministic policy regression cases on control changes
and weekly. Extend these cases whenever a boundary fails. They verify orchestration
policy, not the model's capability. Real model evals need a curated corpus of accepted
Sump-it tasks and outcome checks; no synthetic pass-rate claim is made here.

After an incident: create an issue → run `learn` → review the lesson → create a
linked implementation issue for the regression test/fix → use design/plan/build.
No production telemetry/webhook is connected by this change, and there is no
automatic deploy or rollback. Existing application runtime and deployment are untouched.

Track time from issue to accepted spec, plan to green PR, review/fix rounds,
first-pass CI success and escaped regressions using issue/PR timestamps and workflow
history. Tune REVIEW.md when findings repeat or prove unhelpful. A metrics dashboard
and a model eval corpus can be added when real workflow history exists.
