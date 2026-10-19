---
name: kiro-web-github-automation
description: Use when configuring or operating Kiro Web with GitHub issues, the Kiro Agent GitHub App, ready-for-agent workflows, scheduled Automations, or autonomous implementation sessions.
---
# Kiro Web GitHub Automation

Use Kiro Web's documented GitHub integration instead of trying to make a local hook poll GitHub.

## Native issue triggers

Kiro Web starts work on a GitHub issue when either:

- the issue receives the `kiro` label; or
- an issue comment contains `/kiro` at the beginning or after whitespace.

`@kiro` is not the documented trigger. Do not tell users that a normal mention invokes Kiro.

The user assigning the issue needs write access, and the Kiro Agent GitHub App must be installed and authorized for the repository in Kiro Web settings.

## Project workflow

This repository uses these labels:

- `ready-for-agent`: the issue is specified and eligible for implementation
- `kiro`: invoke Kiro Web immediately
- `ready-for-human`: implementation is complete and awaiting human review

For an immediately eligible issue, add both `ready-for-agent` and `kiro`. Do not add `kiro` to an issue whose blockers are still open.

When Kiro starts from an issue, it should:

1. Read the complete issue body and comments.
2. Read `AGENTS.md` and `.kiro/steering/`.
3. Respect `Blocked by` references in the issue body.
4. Work in an isolated branch.
5. Run the required tests and coverage checks.
6. Open a pull request and leave merging to a human.

## Scheduled frontier automation

For unattended selection of ready work, configure a Kiro Web Automation with an hourly, daily, or custom CRON schedule. Its prompt should:

1. Find open issues labeled `ready-for-agent`.
2. Exclude the parent spec/epic unless explicitly requested.
3. Parse each issue's `Blocked by` section.
4. Select the oldest issue whose blockers are closed.
5. Run the implementation workflow for that issue.
6. Open a pull request targeting the default branch.
7. Do nothing when no eligible issue exists.
8. Never merge the pull request automatically.

`ready-for-agent` is a project convention, not a native Kiro trigger. The automation prompt must implement the frontier selection logic. The native immediate trigger is the `kiro` label or `/kiro` comment.

Suggested automation prompt:

```text
Inspect this repository for open GitHub issues labeled ready-for-agent.
Choose the oldest issue whose blockers, listed under "Blocked by", are all
closed. Exclude parent specs unless explicitly requested. Read the full issue,
AGENTS.md, and .kiro/steering files. Implement the issue in an isolated branch,
run its required tests and coverage checks, and open a pull request against the
default branch. Never merge. If no eligible issue exists, make no code changes
and report that no work was available.
```

## Hooks limitation

Kiro Web sessions do not execute `.kiro/hooks`. Hooks are event-driven local IDE/CLI automation and do not provide cron or GitHub polling. Use Web Automations for scheduled work.

## Review policy

Kiro Web opens pull requests but does not merge them automatically. A human must review the PR, verify environment-dependent behavior such as Postgres integration tests, and merge it.

## Official documentation

- [Kiro Web Automations](https://kiro.dev/docs/web/automations.md)
- [Kiro Web GitHub integration](https://kiro.dev/docs/web/github.md)
- [Creating tasks from GitHub issues](https://kiro.dev/docs/web/using-the-agent/creating-tasks.md)
- [Kiro Web Autonomous mode](https://kiro.dev/docs/web/autonomous-mode.md)
- [Kiro Hooks](https://kiro.dev/docs/hooks.md)
