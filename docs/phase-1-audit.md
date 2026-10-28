# Phase 1 audit (code-level)

Scope: what was actually inspected is the uploaded repository snapshot
(`IIRS-SIS-main_2.zip`). **No live database, Supabase dashboard, Vercel project,
Google Sheet or deployed site was accessed.** Everything about live state below
is therefore unverified and listed under "Unknown".

## Checks run on the snapshot
| Check | Result |
| --- | --- |
| `tsc --noEmit` | passed |
| `eslint` | passed |
| `npm run test:validation` | 9 of 9 passed (6 existing + 3 new) |
| `next build` | could not complete in the review sandbox: it blocks Google Fonts (`next/font` fetch of Geist). Not a code error; CI/Vercel has internet. Unverified here. |

## Confirmed in code
- Auth: password sign-in only, no sign-up route, active-staff check on every
  student read/write (`requireActiveStaff`) plus RLS. Good foundation.
- Students: list (search ID/name, status filter, 20/page), profile, add, edit.
  Only `student_id`, `full_name`, `enrollment_status`. No Khmer name, DOB,
  guardians, address, class, photo or attendance.
- Classes/Attendance/Grades/Reports: honest "Not implemented" panels, no fake data.
- Staff & Access / Settings: read-only role display; dark/light toggle is not saved.
- No localisation. Root font is Geist (Latin only); no Khmer-capable font.
- Student pages (`/dashboard/students/*`) are standalone dark pages, not inside
  the dashboard shell (no sidebar, no language selector, no light theme).

## Mismatch that blocks safe database work
`migrations/20261028120000_student_records_foundation.sql` **aborts if
`public.students` exists**, but the live table already exists (you confirmed
five columns, RLS and policies). So that migration is not the record of how the
live table was made and must NOT be run. The live schema, column grants,
constraint on `enrollment_status` and migration history are unknown until
`supabase/diagnostics/full_schema_audit.sql` is run.

## Fixed in this phase
- Search box treated `%` and `_` as wildcards (typing `_` matched everyone).
  Now matched literally (`src/lib/sis/search-escape.ts`, 3 tests).

## Noted, not changed
- `.env.local` is inside the zip. It is git-ignored and holds only the two
  public Supabase values, but do not share the zip or commit that file.
- The zip has no `.git` and no `.github/workflows`, although the README
  describes CI. The branch `feature/sis-phase-1-audit` was created in a fresh
  local repository; push it to your real repo by copying the changed files.
- `staff_profiles` read failures in `getActiveStaff` are logged and treated as
  "not staff" (safe default, but it can hide a database outage as a login loop).

## Unknown (needs you)
Live schema/grants/policies/migration history, whether the deployed site is the
same Supabase project as development, Google Sheet structure, QR-attendance
Google setup, school status vocabulary and ID format.
