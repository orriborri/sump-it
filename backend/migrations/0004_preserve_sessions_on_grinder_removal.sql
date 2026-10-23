-- Ticket #165: deleting/retiring a grinder must NEVER delete brewing_sessions.
--
-- Brewing sessions are IMMUTABLE HISTORY: once a brew is logged, removing the
-- equipment it referenced must not erase the record of the brew. Migration
-- 0001_init.sql declared `brewing_sessions.grinder_id ... ON DELETE CASCADE`,
-- so a single `DELETE FROM grinders` silently destroyed every session that had
-- used that grinder. That is data loss.
--
-- This migration makes grinders follow the SAME soft-delete policy coffee_beans
-- already use (an `is_active` flag that list/get filter on), and hardens the
-- foreign key so a hard delete can never cascade:
--
--   1. Add `grinders.is_active BOOLEAN NOT NULL DEFAULT true`, mirroring
--      `coffee_beans.is_active`. Retiring a grinder flips this flag; its rows
--      and every session that references it are left untouched.
--   2. Replace the `brewing_sessions.grinder_id` FK's `ON DELETE CASCADE` with
--      `ON DELETE RESTRICT`. With soft-delete this is the normal path (rows are
--      never hard-deleted), but if a grinder IS hard-deleted while sessions
--      reference it, the database now REFUSES the delete instead of cascading
--      and destroying history.
--
-- Migrations are append-only: 0001_init.sql is the committed source of truth
-- and is NOT edited in place. This migration runs against the schema 0001
-- created and is DB-required; the sandbox has no Postgres, so it is executed
-- only in CI (see tests/grinders_integration.rs).

-- (1) Soft-delete flag for grinders, consistent with coffee_beans.
ALTER TABLE grinders
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_grinders_active ON grinders(is_active);

-- (2) Harden the grinder foreign key: drop the CASCADE rule from 0001 and
-- re-add the same column reference with ON DELETE RESTRICT so a hard delete can
-- never cascade-delete sessions. Postgres named the inline FK from 0001
-- `brewing_sessions_grinder_id_fkey` (table + column + `_fkey`); guard with
-- IF EXISTS so the migration is idempotent.
ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
