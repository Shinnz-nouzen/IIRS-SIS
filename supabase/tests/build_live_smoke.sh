#!/bin/sh
# One atomic DO statement: Phase 2 migration + compact smoke test, rolled back by
# the final RAISE EXCEPTION. Comments and blank lines are stripped to keep it short.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
printf 'do $dry$\nbegin\n'
cat "$here/../migrations/20261029100000_student_management_phase2.sql" "$here/phase2_live_smoke.body.sql" | grep -v '^[[:space:]]*--' | grep -v '^[[:space:]]*$'
printf 'end\n$dry$;\n'
