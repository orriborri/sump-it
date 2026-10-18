# Issue Tracker Configuration

## Tracker Type: GitHub
This repository uses GitHub Issues for tracking work.

## Workflow Description
- **Issues location**: https://github.com/orriborri/sump-it/issues
- **CLI tool**: `gh` (GitHub CLI)
- **Label system**: Standard GitHub labels + custom triage labels
- **PR workflow**: Branch -> PR -> Review -> Merge

## Authentication
The `gh` CLI is pre-configured in this environment with appropriate permissions.

## Integration Points
1. Issues are created via `gh issue create`
2. PRs are created via `gh pr create`
3. Comments and updates via `gh` commands
4. Automatic linking between commits and issues

## Special Notes
- This is a consolidated coffee brewing application
- Combines features from sump-it, rustyCoffy, and BeanIt
- Uses TypeScript frontend + Rust backend architecture