#!/usr/bin/env bash
# Same verification commands as the existing Contract + coverage gates.
set -euo pipefail
snapshot=$(mktemp -d)
trap 'rm -rf "$snapshot"' EXIT
cp -a frontend/lib/generated "$snapshot/generated"
(cd backend && cargo test export_bindings)
diff -ru "$snapshot/generated" frontend/lib/generated
(cd frontend && npm run type-check)
make coverage
echo 'AI verification passed: contract, types, backend and frontend coverage.'
