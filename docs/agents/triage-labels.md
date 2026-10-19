# Triage Labels Configuration

## Default Triage Labels
This repository uses the default triage label vocabulary:

- **`needs-triage`**: Issue needs initial triage and categorization
- **`needs-info`**: More information is required before work can begin
- **`ready-for-agent`**: Issue is ready for AI agent to work on
- **`ready-for-human`**: Issue requires human intervention or review
- **`wontfix`**: Issue will not be addressed (with reason in comments)

## Kiro Web Trigger Label

- **`kiro`**: Native Kiro Web trigger label. Add only after `ready-for-agent` triage is complete, the issue is unblocked, and autonomous implementation is intended. This is a trigger label, not one of the five triage state roles.

## Label Usage
These labels are applied during the triage process to indicate the current state of each issue. The `triage` skill uses these labels to categorize and prioritize work.

## Integration with GitHub
When using the `triage` skill with GitHub Issues, these labels will be created if they don't already exist in the repository.