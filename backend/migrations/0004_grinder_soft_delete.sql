-- Issue #165: deleting a grinder must NOT cascade-delete historical brewing
-- sessions.
--
-- Two problems shipped together in 0001_init.sql:
--   1. Grinders had no soft-delete column, so `GrinderService::delete_grinder`
--      issued a hard `DELETE FROM grinders`, while beans are soft-deleted
--      (`coffee_beans.is_active`, see services/beans.rs delete_bean).
--   2. `brewing_sessions.grinder_id` referenced `grinders(id)` with
--      `ON DELETE CASCADE`, so hard-deleting a grinder erased EVERY brewing
--      session that ever used it, silently destroying session history and bean
--      usage history.
--
-- Brewing sessions are immutable historical records. This migration aligns the
-- grinder lifecycle with the bean soft-delete policy and hardens the FK so the
-- history can never be cascade-deleted:
--
--   (a) add `is_active BOOLEAN NOT NULL DEFAULT true` to `grinders`, mirroring
--       `coffee_beans.is_active`. `GrinderService::delete_grinder` now flips
--       this flag (soft delete / retire) instead of removing the row, and
--       `list_grinders` / `get_grinder` filter `WHERE is_active = true` so
--       retired grinders disappear from active listings. The sessions JOIN and
--       bean-usage-history JOIN deliberately do NOT filter on it, so historical
--       sessions whose grinder is now retired still resolve.
--
--   (b) replace the `ON DELETE CASCADE` FK on `brewing_sessions.grinder_id`
--       with `ON DELETE RESTRICT` (belt-and-suspenders): even if a hard delete
--       is ever attempted again, Postgres refuses it while any session
--       references the grinder, so history is protected at the schema level.
--       Postgres cannot alter a FK in place, so the auto-named constraint from
--       0001 (`brewing_sessions_grinder_id_fkey`) is dropped and re-added.
--
-- This migration is forward-only and runs against the schema created by
-- 0001_init.sql. It is DB-required; the sandbox has no Postgres, so it is NOT
-- executed here (see tests/grinder_delete_preserves_sessions_db.rs).

-- (a) Grinder soft-delete column, mirroring coffee_beans.is_active.
ALTER TABLE grinders
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_grinders_active ON grinders(is_active);

-- (b) Protect session history: swap ON DELETE CASCADE for ON DELETE RESTRICT.
ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
