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
-- can never be deleted as a side effect of removing a grinder.
--
-- The FK from 0001 was created unnamed, which Postgres conventionally
-- auto-names `brewing_sessions_grinder_id_fkey` (the `{table}_{column}_fkey`
-- pattern). A bare `DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey`
-- would silently no-op if a deployment ever acquired the constraint under a
-- different name (e.g. a manual recreate, or a future Postgres that changed
-- the auto-naming), leaving the old `ON DELETE CASCADE` FK in place while this
-- migration adds a SECOND, RESTRICT constraint - so a cascade could still
-- fire. To be robust, look the real constraint name up from the catalog and
-- drop WHATEVER foreign key currently constrains
-- `brewing_sessions.grinder_id` referencing `grinders`, regardless of its
-- name, before adding the RESTRICT one.
DO $$
DECLARE
    fk_name text;
BEGIN
    FOR fk_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN pg_attribute att
            ON att.attrelid = con.conrelid
           AND att.attnum = con.conkey[1]
        WHERE con.contype = 'f'
          AND child.relname = 'brewing_sessions'
          AND parent.relname = 'grinders'
          AND att.attname = 'grinder_id'
          -- single-column FK on grinder_id only
          AND array_length(con.conkey, 1) = 1
    LOOP
        EXECUTE format(
            'ALTER TABLE brewing_sessions DROP CONSTRAINT %I',
            fk_name
        );
    END LOOP;
END $$;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
