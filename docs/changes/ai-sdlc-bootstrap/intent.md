# Intent: AI SDLC loops for Sump-it

Give the maintainer a GitHub-native path from request to reviewed implementation,
with test feedback and review fixes handled by agents. The user selected the
existing `orriborri/sump-it` GitHub repository after initially mentioning GitLab.
Keep accepted requirements/plans in git and preserve the existing coverage gates.
Success: reviewable artifacts and verified PRs, with human control of acceptance.
The runner must be vendor neutral: no required provider, SDK, action, model or account.

Non-goals: migration to GitLab, automatic merging/production deployment, new
production credentials, an invented model-evaluation dataset, or telemetry wiring.
