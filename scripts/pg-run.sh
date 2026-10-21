#!/usr/bin/env bash
# Bootstraps a throwaway PostgreSQL 15 instance (extracted from Amazon Linux
# RPMs into /root/.cache/pgdist) and runs the command passed as arguments with
# DATABASE_URL / TEST_DATABASE_URL pointing at a fresh "sumpit_test" database.
#
# WHY: this sandbox has no Docker/podman (conmon is broken) and a read-only
# root filesystem, so a normal `postgres` service install is impossible. The
# server binaries were unpacked to a writable prefix and Postgres refuses to
# run as root, so the cluster is initialised and started as the unprivileged
# `ecs-user`. Everything lives under /tmp (tmpfs) which is wiped between shell
# invocations, so the whole lifecycle (initdb -> start -> run -> stop) MUST
# happen inside a single command: this script.
set -euo pipefail

PGROOT=/root/.cache/pgdist/root
export PATH="$PGROOT/usr/bin:$PATH"
export LD_LIBRARY_PATH="$PGROOT/usr/lib64:$PGROOT/usr/lib64/pgsql:${LD_LIBRARY_PATH:-}"

WORK=/tmp/pgwork
PORT=5433
DB=sumpit_test

rm -rf "$WORK"
mkdir -p "$WORK"
chmod 777 "$WORK"
chmod -R a+rX /root/.cache/pgdist/root 2>/dev/null || true
chmod a+rx /root /root/.cache /root/.cache/pgdist 2>/dev/null || true

cat > "$WORK/run-as-pg.sh" <<PGSH
set -euo pipefail
export PATH="$PGROOT/usr/bin:\$PATH"
export LD_LIBRARY_PATH="$PGROOT/usr/lib64:$PGROOT/usr/lib64/pgsql:\${LD_LIBRARY_PATH:-}"
D="$WORK/pgdata"
initdb -D "\$D" -U postgres -A trust --no-locale --encoding=UTF8 > "$WORK/initdb.log" 2>&1
pg_ctl -D "\$D" -l "$WORK/pg.log" -o "-p $PORT -k $WORK -c listen_addresses=127.0.0.1" -w start
createdb -h 127.0.0.1 -p $PORT -U postgres $DB
PGSH
chmod 755 "$WORK/run-as-pg.sh"

runuser -u ecs-user -- bash "$WORK/run-as-pg.sh"

stop_pg() {
  runuser -u ecs-user -- bash -c "export PATH=$PGROOT/usr/bin:\$PATH; export LD_LIBRARY_PATH=$PGROOT/usr/lib64:$PGROOT/usr/lib64/pgsql; pg_ctl -D $WORK/pgdata -w stop" >/dev/null 2>&1 || true
}
trap stop_pg EXIT

export DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/$DB"
export TEST_DATABASE_URL="$DATABASE_URL"
export PGHOST="127.0.0.1"
export PGPORT="$PORT"
export PGUSER="postgres"
export PGDATABASE="$DB"

echo "[pg-run] Postgres up on $WORK:$PORT db=$DB; running: $*"
"$@"
