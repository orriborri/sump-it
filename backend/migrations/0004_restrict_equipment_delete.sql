-- Ticket #165: deleting a grinder must no longer cascade-delete historical
-- brewing sessions.
--
-- POLICY: brewing_sessions are IMMUTABLE HISTORICAL RECORDS. A session records
-- what actually happened on a given day (which bean, which grinder, what dose
-- and rating); removing a piece of equipment is equipment cleanup and MUST NOT
-- rewrite history. This mirrors the existing bean policy, where beans are
-- SOFT-deleted (`coffee_beans.is_active = false`, see
-- backend/src/services/beans.rs) precisely so their usage history survives.
--
-- 0001_init.sql declared BOTH equipment foreign keys on brewing_sessions with
-- `ON DELETE CASCADE`:
--   bean_id    UUID NOT NULL REFERENCES coffee_beans(id) ON DELETE CASCADE
--   grinder_id UUID NOT NULL REFERENCES grinders(id)     ON DELETE CASCADE
-- so a hard DELETE of a grinder (backend/src/services/grinders.rs) erased every
-- session that ever used it, and a hard DELETE of a bean would do the same.
-- Beans are soft-deleted today so the bean cascade is latent, but it is the
-- same data-loss trap; we close both here.
--
-- CHOSEN MECHANISM: switch both FKs to `ON DELETE RESTRICT`. The database now
-- refuses to delete any equipment row still referenced by a session, raising a
-- foreign-key-violation (SQLSTATE 23503). `GrinderService::delete_grinder`
-- translates that violation into a clean `DeleteError::Referenced` so the API
-- returns `409 Conflict` ("this grinder has brewing sessions") instead of a 500
-- or a silent history wipe. An unreferenced grinder still deletes normally.
--
-- Enum/text casing is unchanged (no enum touched); only the two FK constraints
-- are redefined. Postgres auto-named the 0001 foreign keys
-- `brewing_sessions_bean_id_fkey` and `brewing_sessions_grinder_id_fkey`
-- (table + column + `_fkey`); we drop them by that name guarded with IF EXISTS
-- so the migration is idempotent, then re-add them with RESTRICT. NOT NULL on
-- both columns is defined on the column itself (0001) and is untouched.
--
-- VERIFICATION (confirm the auto-generated FK names before/after):
--   SELECT conname, confdeltype, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'brewing_sessions'::regclass AND contype = 'f';
--   -- expect confdeltype 'r' (RESTRICT) for both after this migration.
--
-- This migration is DB-required; the sandbox has no Postgres, so it is NOT
-- executed here. The regression that a session survives grinder removal is
-- encoded in backend/tests/grinders_integration.rs.

ALTER TABLE brewing_sessions
    DROP CONSTRAINT IF EXISTS brewing_sessions_grinder_id_fkey,
    DROP CONSTRAINT IF EXISTS brewing_sessions_bean_id_fkey;

ALTER TABLE brewing_sessions
    ADD CONSTRAINT brewing_sessions_grinder_id_fkey
        FOREIGN KEY (grinder_id) REFERENCES grinders(id) ON DELETE RESTRICT,
    ADD CONSTRAINT brewing_sessions_bean_id_fkey
        FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE RESTRICT;
