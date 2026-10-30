# Phase 2 — Student management module

Status: code complete; **migration prepared but not applied** to the live project.
Date of verification: 2026-10-30.

## What was built

| Area | Where |
| --- | --- |
| Schema (additive, forward-only) | `supabase/migrations/20261029100000_student_management_phase2.sql` |
| Validation (pure, unit-tested) | `src/lib/sis/student-validation.ts` |
| Data layer / Server Actions | `src/lib/sis/student-records.ts`, `class-records.ts`, `src/app/dashboard/**/actions.ts` |
| Shell, English/Khmer, theme | `src/app/dashboard/dashboard-shell.tsx`, `layout.tsx`, `src/lib/i18n/*` |
| Pages | `/dashboard/students` (directory), `/new`, `/[id]` (profile), `/[id]/edit`, `/dashboard/classes` |

### Data model

* `students` (extended): `full_name` stays the English/Latin name; new `full_name_km`,
  `date_of_birth`, `gender` (female/male), `place_of_birth`, `nationality`,
  `admission_date`, `photo_path`, address (`address_line`, `village`, `commune`,
  `district`, `province`, `address_notes`), `home_latitude`/`home_longitude`
  (both or neither). Status list widened to `pending, active, on_leave, graduated,
  transferred, withdrawn, inactive` (`active`/`inactive` unchanged).
* `classes` (per school year) and `student_enrollments` (history; `left_on is null`
  = current; at most one current class per student).
* `student_guardians` (one primary per student, enforced by trigger + unique index)
  and `student_emergency_contacts`.
* `staff_preferences` (language per account).
* `student_directory` view (`security_invoker`, so the caller's RLS applies).
* RPCs, `SECURITY INVOKER`: `register_student` (student + guardian + contact + class
  in one transaction), `assign_student_class`, `end_student_enrollment`.
* Private `student-photos` bucket (1 MB, JPEG/PNG/WebP) with active-staff-only policies.
* Audit: the private audit table now also records guardian, emergency-contact and
  enrollment inserts/updates/**deletes** (field names only, never values).

Security model is unchanged: every new table has RLS enabled and is `revoke all`
from `public, anon, authenticated` before explicit column-level grants; policies use
the existing `is_active_staff()`. Students cannot be deleted; enrollment history is
append-only; `student_id` and timestamps are not writable.

## Verification results

| Check | Result |
| --- | --- |
| SQL assertions on a local PG16 replica of the live baseline (`supabase/tests`) | 113 / 113 |
| Same migration + compact smoke test **on the live project, rolled back** | 35 / 35; live schema confirmed unchanged afterwards |
| Unit tests (`npm run test:validation`) | 36 / 36 |
| `tsc --noEmit`, `eslint src` | clean |
| `next build` (copy with only the Geist Google-font import stubbed; sandbox has no internet) | succeeds |
| Browser end-to-end (`e2e/`) on real Postgres + PostgREST | 137 / 137 |

Bugs found by this testing and fixed: form reset wiped `<select>` values after a
validation error; a page number past the end returned "unavailable" (PostgREST 416);
Khmer dates caused a hydration mismatch (Intl/ICU differences, now fixed month tables);
Postgres error `details` (a whole failing row) would have been logged; a language
`upsert` would have been blocked by column grants; the audit script's trigger filter
silently matched nothing.

### Not verified (be explicit)

* Real Supabase **Auth** login flow and real **Storage** upload/signing — the browser
  tests used a simulated session and an in-memory Storage mock. The Storage *policies*
  and bucket were verified on the live project at SQL level. First real photo upload
  should be tried right after deployment.
* Khmer wording is a first draft and needs review by a Khmer speaker.
* Production build was verified with the Google font import stubbed (sandbox only).
* Not tested: very large data sets, concurrent editing by two staff, browsers other
  than headless Chromium.

## Applying it

The live project has **no migration history table** (schema was applied from the SQL
editor). Choose one:

1. SQL editor: run the migration file as-is. Optionally dry-run first with
   `supabase/tests/build_live_smoke.sh` (one atomic statement, always rolled back).
2. Supabase CLI: first `supabase migration repair --status applied 20261026200000 20261028120000`,
   then `supabase db push`.

Order: apply the migration, run `supabase/tests/build_dry_run.sh --verify-only` (rolls
back), then deploy the app. The migration is backward compatible with the currently
deployed Phase 1 code (it only adds columns/objects and widens one check).

Then: add classes at `/dashboard/classes`, register one clearly fictional student
including a photo, confirm the photo appears, and only then enter real data.

## Decisions the school still has to make

* Official enrollment-status terms (current list is provisional).
* Class/grade naming and school-year format (currently free text, `YYYY-YYYY`).
* Student-ID format (currently any text up to 64 characters, unique, immutable).
* Whether more guardian relationship types or genders are needed.
* Khmer terminology review.

## Known trade-offs

* Directory search uses GET parameters, so search terms (including phone numbers) appear
  in request URLs, hosting logs and browser history. Moving search to POST would avoid it
  at the cost of shareable/bookmarkable searches.
* Map: coordinates are typed or taken from the device GPS; the profile shows an
  OpenStreetMap embed (loads from openstreetmap.org when the profile is opened). There
  is no click-to-drop-pin picker.
* At most 10 guardians and 10 emergency contacts per student (enforced in the app).
* No bulk import, no audit-log viewer, no student deletion (by design).
* Existing files use CRLF line endings; new files use LF.
