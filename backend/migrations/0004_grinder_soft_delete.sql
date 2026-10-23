-- Ticket #165 (data loss): stop grinder removal from cascade-deleting brewing
-- sessions.
--
-- 0001_init.sql declared `brewing_sessions.grinder_id ... REFERENCES grinders(id)
-- ON DELETE CASCADE`, while `GrinderService::delete_grinder` HARD-DELETEs the
-- grinder row. The combination means removing a grinder silently destroys every
-- brewing session that ever used it - unrecoverable history loss. Beans already
-- avoid this by SOFT-DELETING (`is_active = false`); grinders did not mirror
-- that policy.
--
-- This migration brings grinders in line with the bean policy and hardens the
-- foreign key, migrations being the ONLY schema source (0001 is never edited in
-- place):
--
--   1. Add `is_active BOOLEAN NOT NULL DEFAULT true` to `grinders`, mirroring
--      `coffee_beans.is_active`. `delete_grinder` now flips this flag instead of
--      deleting the row, so a retired grinder stays joinable from historical
--      sessions while being filtered out of active listings.
--
--   2. Replace the `ON DELETE CASCADE` foreign key with `ON DELETE RESTRICT`.
--      Soft-delete already means no row is ever removed, but RESTRICT is a
--      belt-and-braces guard: any future/stray hard DELETE of a referenced
--      grinder now FAILS loudly rather than cascading away sessions. The
--      Postgres-generated constraint name for the unnamed 0001 FK is
--      `brewing_sessions_grinder_id_fkey`; we drop it by that name (guarded with
--      IF EXISTS for idempotency) and re-add it with the safer action.
--
-- This migration is DB-required; the sandbox has no Postgres, so it is NOT
-- executed here. It is exercised by the `#[ignore]`d DB integration tests
-- (see tests/grinders_integration.rs) which CI runs against a real Postgres.

ALTER TABLE grinders
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_grinders_active ON grinders(is_active);

ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT;
