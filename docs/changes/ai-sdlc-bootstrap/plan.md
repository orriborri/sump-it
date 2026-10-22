# Plan: bootstrap

1. Add a standard-library Python controller for prerequisites, context, scope,
   verified patch publication and commit-specific review results.
   Keep inference in a separate standard-library runner with HTTP and command
   adapters; exercise tool iteration, role boundaries and failure handling offline.
2. Add the local verification command using the existing contract/coverage gates.
3. Add delivery, review and control-check workflows. Enable explicit dispatch for
   contract checks because the publisher uses GITHUB_TOKEN.
4. Define REVIEW.md, workflow documentation and the agent-context entry points.
5. Check policy rejection paths, workflow syntax and shell syntax; perform the
   repository's two-axis review before publishing this bootstrap PR.

Risk: live model/API runs depend on a configured endpoint/adapter and repository settings.
Default-branch protection and the environment reviewer must be configured outside
git. Treat controller policy as defense in depth, not a hostile-code sandbox.
Rollback: remove/disable the AI workflows; existing contract checks stay usable.
