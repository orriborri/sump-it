# 0002: Bean and grinder services own write validation

- Status: Proposed
- Date: 2026-11-18
- Related: [Issue #166](https://github.com/orriborri/sump-it/issues/166), [PR #208](https://github.com/orriborri/sump-it/pull/208)

## Context

Bean and grinder HTTP handlers validated inputs, but direct service callers could bypass those checks. The existing HTTP error status codes and messages must remain stable.

## Options considered

- Keep validation in the HTTP handlers and require every other caller to run it separately. This leaves validation optional and risks divergent behavior.
- Validate in each service command before touching the database and translate its errors at the HTTP boundary. This follows the existing session-service pattern.

## Decision

Bean and grinder create and update commands enforce the existing field and domain rules before issuing SQL. HTTP handlers map the typed service errors to the existing responses; they do not reimplement the rules. Database constraints remain in place.

## Consequences

Every caller gets the same validation outcome. Direct callers handle a typed write error instead of a generic database error. This does not change recipe or session rules.

## Verification

Direct service tests exercise invalid inputs without a working database. Router tests verify the HTTP responses, and PostgreSQL integration tests independently exercise the grinder constraints.
