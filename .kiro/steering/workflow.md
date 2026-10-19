# Coffee Brewer - Ticket Implementation Workflow

## Ticket Implementation Policy
All tickets (GitHub issues) MUST be implemented using the `/implement-spec` skill.

- When starting work on any ticket, use `/implement-spec` to drive the implementation.
- This applies to every issue regardless of size, including trivial fixes and chores.
- `/implement-spec` lives in `.kiro/skills/implement-spec/` in this repository.

## Nothing-to-Implement Policy
If a ticket turns out to have nothing to implement (for example, the work is
already complete and merged, or the acceptance criteria are already satisfied by
existing code), do NOT open an empty pull request. Instead:

- Close the ticket.
- Add a comment on the ticket explaining why there was nothing to implement
  (e.g., reference the commit/PR that already delivered it, and note that the
  acceptance criteria are already met and verified).

## Rationale
Using a single, consistent implementation skill keeps ticket delivery uniform:
spec alignment, structured implementation, and verification follow the same path
every time, which keeps 100% coverage and the end-to-end vertical slice conventions
intact.
