-- Ticket #165: deleting a grinder must not cascade-delete historical brew
-- sessions. Brewing sessions are immutable historical records.
--
-- Migration 0001_init.sql hard-coupled the two equipment lifecycles
-- inconsistently: beans are soft-deleted (`coffee_beans.is_active = false`)
-- while grinders were hard-deleted, and `brewing_sessions.grinder_id` used
-- `ON DELETE CASCADE`. Deleting a grinder therefore erased EVERY brewing
-- session that ever used it, silently destroying session history and the
-- bean-usage history that joins through it.
--
-- This migration aligns grinders with the bean policy and hardens the FK:
--   (a) add `grinders.is_active` (default true) so grinders can be RETIRED
--       (soft-deleted) instead of removed - `GrinderService::delete_grinder`
--       now sets this to false, and list/get exclude inactive grinders; and
--   (b) change the `brewing_sessions.grinder_id` FK from ON DELETE CASCADE to
--       ON DELETE RESTRICT, so even a direct hard DELETE of a referenced
--       grinder is refused rather than cascading away the sessions. With the
--       soft-delete path in the service, rows are never removed in normal
--       operation; RESTRICT is the defence-in-depth backstop.
--
-- This migration is DB-required and runs against the schema from 0001-0003.

-- (a) Soft-delete column, mirroring coffee_beans.is_active.
ALTER TABLE grinders
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Exclude retired grinders from the brand/type lookups the list uses, and make
-- the common "active grinders" scan cheap, mirroring idx_coffee_beans_active.
CREATE INDEX IF NOT EXISTS idx_grinders_active ON grinders(is_active);

-- (b) Replace the cascading FK with a restricting one so historical sessions
-- can never be deleted as a side effect of removing a grinder. The FK from
-- 0001 was created unnamed, which Postgres auto-named
-- `brewing_sessions_grinder_id_fkey`.
ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
