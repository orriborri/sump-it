# AI-native SDLC loops

Based on [Anthropic's AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook).
GitHub Issues describe requests; merged change artifacts in this repository are
the authoritative intent, spec and plan. PRs retain review and verification evidence.
The existing `.kiro/skills/` stay the source for engineering guidance; the CI agent
reads their files directly rather than assuming they are installed slash commands.

## One-time activation

1. Merge the workflow PR. Configure your inference endpoint/agent adapter using
   the provider-neutral settings below. Store any credential as `AI_API_KEY` in
   repository Settings → Secrets and variables → Actions, never in an issue or file.
2. In Settings → Actions → General, allow GitHub Actions to create pull requests.
   No personal access token or model-vendor GitHub App is required: only the
   controller/publisher/posting jobs use the built-in GitHub token.
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
committing these files. Model execution needs a configured endpoint/model or command
adapter before its first run; an unauthenticated local endpoint need not have a key.

## Provider-neutral runner

The SDLC controller never imports a model SDK or invokes a vendor action/CLI.
`scripts/ai_runner.py` is the replaceable execution boundary. There is no default
provider, model, subscription or vendor account. Planning, code generation, review
policy, test gates and publishing work independently of that choice.

| Setting | Meaning |
| --- | --- |
| `AI_ADAPTER` | `chat-completions` (included reference implementation) or `command` |
| `AI_API_URL` | Complete tool-capable Chat Completions URL, including its path; no hostname is assumed |
| `AI_MODEL` | Model identifier exposed by that endpoint |
| `AI_API_KEY` secret | Optional Bearer credential; omitted for an unauthenticated endpoint |
| `AI_RUNNER_COMMAND` | For `command`: JSON argv array for an installed executable, not a shell string |

These repository variables configure the common default. Delivery/review may use
different providers, models and runners by setting `AI_DELIVERY_ADAPTER`,
`AI_DELIVERY_API_URL`, `AI_DELIVERY_MODEL`, `AI_DELIVERY_COMMAND` and the corresponding
`AI_REVIEW_*` variables. Role credentials are `AI_DELIVERY_API_KEY` and
`AI_REVIEW_API_KEY` secrets, falling back to the common `AI_API_KEY`.

The reference adapter speaks the widely implemented Chat Completions wire format:
`messages`, function `tools`/`tool_calls`, `choices[0].message`, `max_tokens` and
optional `usage.total_tokens`. It has no provider SDK dependency. Hosted services,
an inference gateway, and local models can be used **if they support this format
and tool calling**. Native APIs with another format need a command adapter or a
gateway; API compatibility is not assumed for every provider. Remote inference
must use HTTPS. Loopback HTTP is allowed for a service running on the same runner.
A local service on your home network is not reachable from a GitHub-hosted runner
without separately provisioning connectivity or an appropriate self-hosted runner.

The review reference adapter exposes only workspace reading/listing; delivery
also exposes file writes and local commands. Local commands do not inherit model
or GitHub API credentials. The review returns validated JSON before the independent
posting job can publish a verdict. No model can approve or merge a PR.

### Alternate agent engines and native APIs

Use `AI_ADAPTER=command` to integrate an existing agent CLI, remote worker adapter
or native API client, without changing the SDLC workflows. Configure an executable
available on the runner, for example `["/opt/agents/company-runner"]`; provisioning
that executable is your adapter deployment responsibility. The wrapper invokes:

```text
<argv> --request <absolute-request.json> --response <absolute-response.json>
```

The version-1 request contains `role` (`delivery` or `review`), `read_only`,
`workspace`, `prompt`, `model`, `max_steps`, `max_output_tokens`, and
`timeout_seconds`. API credentials stay in environment variables, never in the
request. Delivery adapters edit the workspace and return `{"summary":"..."}`.
Review adapters must enforce `read_only` (no commands/writes) and return:

```json
{"verdict":"pass","summary":"No material findings","findings":[]}
```

Finding objects have `severity` (`critical`/`important`), `pass`
(`bugs`/`security`/`spec`), `path` and `detail`. Other verdicts are `findings` and
`blocked`; a pass with findings is rejected. Missing/invalid output, a nonzero
adapter exit or a timeout fails closed. Custom adapters must honor step/token
limits and isolation themselves; the wrapper enforces elapsed time and result
validation. The command adapter is a trusted integration, not a hostile-code sandbox.

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
verification attempts. The reference adapter enforces 60 inference steps for
delivery and 25 for review, 4,096 maximum output tokens per response and elapsed
limits of 50/12 minutes, within 60/15-minute workflow jobs. No model is hardcoded.
Custom adapters receive the same limits but enforce step/token limits themselves.
There is no provider-independent dollar cap: set spending limits at your gateway
or provider. Reported usage is retained in the runner result when available.
Failed verification prevents
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
