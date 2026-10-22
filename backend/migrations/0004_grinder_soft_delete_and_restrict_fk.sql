-- Ticket #165 (High / data loss): deleting a grinder must not erase brewing
-- history.
--
-- Before this migration grinders were HARD-deleted (services/grinders.rs ran
-- `DELETE FROM grinders`) and `brewing_sessions.grinder_id` referenced
-- `grinders(id)` ON DELETE CASCADE (0001_init.sql). Removing a single grinder
-- therefore cascade-deleted EVERY brewing session that ever used it, silently
-- destroying the user's brew history and the bean-usage records derived from
-- it. Coffee beans already follow a soft-delete (retire) policy via the
-- `is_active` column (0001_init.sql + idx_coffee_beans_active); grinders did
-- not, so the two equipment lifecycles diverged.
--
-- Decision: brewing sessions are IMMUTABLE HISTORY. A grinder is never truly
-- removed, it is RETIRED, mirroring the bean policy exactly. This migration:
--   (1) adds `is_active` to grinders (default true) so `delete_grinder` can
--       soft-delete (retire) instead of hard-deleting, and adds a matching
--       `idx_grinders_active` mirroring `idx_coffee_beans_active`;
--   (2) hardens the FK as defense-in-depth: `brewing_sessions.grinder_id`
--       becomes ON DELETE RESTRICT, so even a future stray hard `DELETE FROM
--       grinders` is REJECTED by the database rather than silently cascading
--       away session history.
--
-- This migration runs against the schema created by 0001_init.sql and is
-- DB-required; the sandbox has no Postgres, so it is NOT executed here (see
-- tests/grinders_integration.rs and tests/grinder_session_history_db.rs).

-- (1) Retire column + index, mirroring coffee_beans.is_active.
ALTER TABLE grinders
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_grinders_active ON grinders(is_active);

-- (2) Replace the cascading FK with a restricting one. The constraint created
-- implicitly by 0001_init.sql uses Postgres' default name
-- `brewing_sessions_grinder_id_fkey`; drop it (IF EXISTS keeps this safe across
-- environments) and re-add it ON DELETE RESTRICT.
ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
