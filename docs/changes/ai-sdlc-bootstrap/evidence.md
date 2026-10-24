# Bootstrap verification evidence

- Python controller/runner regressions: 27 tests passed locally.
- All four workflow YAML files parsed; each has triggers and job definitions.
- `bash -n scripts/ai-verify.sh` and `git diff --check` passed.
- Actionlint 1.7.7 validated all workflow syntax and expressions successfully
  (ShellCheck integration disabled; shell syntax checked separately).
- Independent Standards and Spec reviews found and prompted fixes for: missing
  fresh-runner output directory; review status needing to target the candidate SHA;
  inline Rust test protection; and missing general submitted review bodies.
  Dedicated regressions cover fresh-runner posting, commit statuses, inline test
  preservation, stale reviews/branches, scope and prerequisites.

Vendor-neutral revision: removed the vendor action, provider-specific credentials
and hardcoded models. Offline runner cases cover tool iteration, separate read-only
review tools, generic endpoint/model selection, command-adapter process execution,
response validation, credential stripping, missing configuration and bounded runs.
Standards review identified orphaned subprocesses on tool timeout. Tools and command
adapters now terminate their process group on timeout and completion; regressions
check that delayed background writes cannot occur after the invocation returns.
No external provider credentials or live inference calls were used.

No application source changed. The existing application coverage suite was not
rerun locally for this workflow/controller change. The new build/fix workflow is
configured to run its full contract/type/real-Postgres coverage verification.

Live inference execution and end-to-end GitHub dispatch/publication have not been
verified: they require a configured endpoint/adapter and activation settings documented
in `docs/agents/ai-sdlc.md`, after this bootstrap change merges. No model capability
eval corpus, production telemetry, automatic deployment or rollback is installed.
