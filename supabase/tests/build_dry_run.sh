#!/bin/sh
# Prints ONE `DO` statement. Because it is a single statement it is atomic: it ends
# in RAISE EXCEPTION, so nothing it does is ever committed.
#
#   ./build_dry_run.sh                 migration + verification  (BEFORE the migration is applied)
#   ./build_dry_run.sh --verify-only   verification only         (AFTER the migration is applied)
set -eu
here=$(cd "$(dirname "$0")" && pwd)
printf 'do $dry$\nbegin\n'
if [ "${1:-}" != "--verify-only" ]; then
  cat "$here/../migrations/20261029100000_student_management_phase2.sql"
  printf '\n'
fi
cat "$here/phase2_verification.body.sql"
printf '\nend\n$dry$;\n'
