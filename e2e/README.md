# End-to-end test rig (test tooling only)

Drives the real Next.js app in headless Chromium against a **local** PostgreSQL
(+ PostgREST) that has the three migrations applied. It is how the Phase 2 UI
was verified (137 checks: registration, validation, directory search/filters,
edit, photos, guardians, class changes, English/Khmer, theme, mobile, inactive
staff, audit trail, no personal data in logs).

Real: PostgreSQL schema, RLS, grants, constraints, triggers, RPCs, PostgREST, the
Next.js server and Server Actions, the browser UI.

**Simulated** (these results say nothing about them):
- Supabase Auth: sessions are signed with a locally generated ES256 key whose JWKS
  `server.mjs` serves; the real login flow is not exercised.
- Supabase Storage: `server.mjs` is a small in-memory mock of upload / sign / delete.

Setup is manual; paths assume `/tmp/e2e`, Postgres `127.0.0.1:54329` (database
`sis_e2e` created from `supabase/tests/00_supabase_shim.sql` + the migrations),
PostgREST `:3001` (`postgrest.conf`), harness `:54321`, `next dev` on `:3000` with
`NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and a publishable key that is an
anon-role JWT signed by the same key. Run `node keys.mjs` once, load `fixtures.sql`,
then `runall.sh part1 part2a part2b`. Needs `puppeteer-core`, `@sparticuz/chromium`,
`jose`. Never point any of this at a real project.
