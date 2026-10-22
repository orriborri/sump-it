-- Ticket #165: deleting a grinder must NOT cascade-delete brewing sessions.
--
-- Migration 0001_init.sql defined `brewing_sessions.grinder_id` with an inline
-- `REFERENCES grinders(id) ON DELETE CASCADE`, so removing a grinder silently
-- erased every brewing session that ever used it (and, via that, the bean usage
-- history the sessions feed). A grinder is equipment that can be retired or
-- replaced; the historical brews logged against it are records that must
-- survive. This mirrors the bean policy: `coffee_beans` has an `is_active`
-- soft-delete flag (0001_init.sql) and `BeanService::delete_bean` only flips
-- that flag, so a retired bean keeps its sessions. Grinders now get the same
-- treatment.
--
-- Two changes, matching the bean soft-delete policy:
--   1. Add `is_active BOOLEAN NOT NULL DEFAULT true` to `grinders` (mirrors the
--      `coffee_beans.is_active` column) plus an index on it mirroring
--      `idx_coffee_beans_active`, so the list/get SELECTs can filter retired
--      grinders out cheaply.
--   2. Replace the destructive `ON DELETE CASCADE` on
--      `brewing_sessions.grinder_id` with `ON DELETE RESTRICT`, so the database
--      refuses to hard-delete a grinder that still has sessions. Combined with
--      the service-level soft delete (set `is_active = false`), a retired
--      grinder keeps all of its sessions and bean usage history.
--
-- Postgres auto-named the inline FK from 0001 `brewing_sessions_grinder_id_fkey`
-- (table name + column name + `_fkey`). We drop it by that name guarded with
-- IF EXISTS so the migration is idempotent, then re-add it with the
-- non-destructive policy. The bean FK (`brewing_sessions_bean_id_fkey`) is left
-- untouched: beans already use the soft-delete flag, so their sessions are
-- never cascade-deleted in practice.
--
-- This migration is DB-required; the sandbox has no Postgres, so it is NOT
-- executed here (see tests/grinders_integration.rs, which encodes the invariant
-- that sessions survive grinder removal).

ALTER TABLE grinders
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_grinders_active ON grinders(is_active);

ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
