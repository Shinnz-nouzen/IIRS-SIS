# Database tests for Phase 2

Nothing in this folder touches data permanently.

| File | Purpose |
| --- | --- |
| `00_supabase_shim.sql` | **Local PostgreSQL only.** Recreates the Supabase roles, `auth.users`, `auth.uid()`, a minimal `storage` schema and Supabase's default privileges so the migrations can run on a plain server. Never run against a real project. |
| `phase2_verification.body.sql` | The assertions (RLS, grants, constraints, triggers, RPCs, audit, storage policies) as the body of a PL/pgSQL block, using fictional `TEST-*` students and fake staff users. |
| `build_dry_run.sh` | Wraps the Phase 2 migration + the verification body into **one `DO` statement**. |

## Why one statement

A single `DO` statement is atomic however a client submits it (the `psql` CLI,
the Supabase SQL editor, an API). It ends with `RAISE EXCEPTION`, which rolls
back the migration, the fixtures and everything else, and carries the PASS/FAIL
report in the error text. Nothing is committed, so the same file can be run on
a copy of the baseline schema **or** on the real project as a dry run.

```sh
./build_dry_run.sh > /tmp/phase2_dry_run.sql
psql "$DATABASE_URL" -q -f /tmp/phase2_dry_run.sql   # prints PHASE2_VERIFICATION_REPORT
```

Expected last line: `SUMMARY pass=<n> fail=0 total=<n>`.

Run it before applying the migration. After applying the migration for real,
re-run only the assertions the same way:

```sh
./build_dry_run.sh --verify-only > /tmp/phase2_verify.sql
```

It creates and then rolls back its own fixtures, so it leaves no data behind.
