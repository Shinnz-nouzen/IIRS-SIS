# Supabase authorization foundation

The SQL migration in `migrations/` is prepared for review only. It has not been
applied to any database. Review and apply it through the project's approved
Supabase migration process before deploying code that queries
`public.staff_profiles`.

## First administrator provisioning

There is intentionally no public bootstrap route or automatic profile creation.
Before deployment, disable public user sign-ups in the Supabase Auth settings.
The application has no sign-up route, and database-backed active-staff checks
deny access to Auth users who have no approved active profile; disabling Auth
sign-ups also prevents uninvited accounts from being created through the Auth
API.

After reviewing and applying the migration:

1. An authorized project owner creates or invites the first administrator
   account through the Supabase Dashboard's Auth user management.
2. The owner obtains that account's Auth user UUID from the dashboard and
   checks that it is the intended account.
3. Using the Supabase SQL Editor as a trusted database administrator, insert
   exactly that user into the staff mapping:

   ```sql
   insert into public.staff_profiles (user_id, role, is_active)
   values ('<AUTH_USER_UUID>'::uuid, 'administrator', true);
   ```

   Replace the placeholder with the verified Auth user UUID. Do not use an
   email address or a UUID supplied by an untrusted browser request.

Create additional staff Auth accounts through a trusted administrator process
and assign each an approved role through a trusted database-admin path. The
application does not yet implement staff invitations, deactivation, or role
management. Ordinary `anon` and `authenticated` clients have no write
privileges on `staff_profiles`.

## Authorization scope

The role mapping supports `administrator` and `office_staff`. Both active roles
are intended for general student/class workflows and attendance, but each
future table operation still requires an explicit RLS policy. Both roles may
export only reports they are authorized to access; future export actions must
check the active staff record server-side and record an audit event. Grades and
sensitive reports remain denied until their operations and policies are
defined. Administrator status is not an RLS bypass.

The reusable server guards in `src/lib/auth/staff.ts` require verified claims
and a current active profile. Future administrator-only actions must use the
administrator guard and must not grant authenticated users direct profile
write access.

## Verification plan

After applying the migration to a non-production Supabase project, verify:

- An active profile can read only its own profile; another authenticated user
  cannot read it.
- `anon` cannot read or invoke the authorization helpers.
- An authenticated user cannot insert, update, or delete profiles, including
  changing their own role or active status.
- `is_active_staff()` and `has_staff_role(...)` reflect only the caller's
  current database-backed profile and return false for missing or inactive
  profiles.
- An authenticated user without an active profile cannot access `/dashboard`;
  an active staff member can.
- Login rejects missing/inactive staff profiles with the generic message and
  clears the rejected session.

No student, class, attendance, grade, or report tables or policies are included
in this foundation. Each future data table needs separately reviewed RLS
policies, operation and row-scope rules, and tests before it is used.

## Student directory foundation (not applied)

`migrations/20261028120000_student_records_foundation.sql` is an unapplied
proposal for the first staff-only student directory. The configured project
could not be confirmed as a development/test project, and the Supabase
Dashboard session was unavailable during implementation. Do not apply this
migration until the target is positively confirmed as non-production and the
existing schema and grants have been inspected.

The public REST schema cache returned `PGRST205` for `public.students`; this
means the relation is not exposed in that schema cache, not necessarily that
no table or view exists elsewhere. The migration deliberately aborts if
`public.students` already exists or `public.is_active_staff()` is missing.

Before applying:

1. In Supabase Dashboard, verify the project is the intended development/test
   project, and verify the staff authorization migration, helper functions,
   table grants, and RLS policies are correctly applied.
2. In SQL Editor, inspect `pg_class`, `information_schema.columns`,
   `pg_policies`, and `information_schema.role_table_grants` for
   `public.students`. If any relation exists, stop and adapt to its reviewed
   schema rather than applying this proposal.
3. Use the project's approved migration workflow to preview and apply this
   migration only after the above checks pass. Never apply it to production
   based only on the REST schema-cache result.
4. Verify anon cannot select or mutate student records, authenticated users
   without an active staff profile cannot access them, and active staff can
   create, search, view, and edit records. Use synthetic records only.

The initial schema stores a manually assigned stable `student_id`, a required
`full_name`, provisional `active`/`inactive` enrollment status, and database
timestamps. The status vocabulary requires school confirmation. Class
association and photos are intentionally not included: no confirmed class
schema or private Storage policies are available. Updates write audit metadata
(actor, timestamp, operation, and changed field names); audit records contain
no student field values and are not readable by application roles.

### Read-only preflight and manual apply

Before applying the student migration, use the Dashboard SQL Editor to run the
following **read-only** checks. These queries inspect metadata only; they do
not return student or staff records:

```sql
select c.relname as relation_name,
       case c.relkind
         when 'r' then 'table'
         when 'p' then 'partitioned table'
         when 'v' then 'view'
         when 'm' then 'materialized view'
         when 'f' then 'foreign table'
         else c.relkind::text
       end as relation_type,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('students', 'staff_profiles', 'student_record_audit');

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('students', 'staff_profiles', 'student_record_audit')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('students', 'staff_profiles', 'student_record_audit')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('students', 'staff_profiles', 'student_record_audit')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

select p.proname,
       pg_get_userbyid(p.proowner) as function_owner,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')
         as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_active_staff',
    'has_staff_role',
    'set_student_updated_at',
    'audit_student_record_change'
  )
order by p.proname;
```

Confirm the project is a non-production development/test project. If
`public.students` exists as any relation, stop; do not apply this migration.
Verify that the staff migration is recorded as applied and its helper/policies
match the reviewed foundation. The student migration itself refuses to create
over an existing relation and checks for the expected staff helper.

For the supported CLI migration workflow, from the project root:

1. Install/use the Supabase CLI and run `npx supabase init` if this workspace
   does not yet have `supabase/config.toml`.
2. Authenticate locally with `npx supabase login` and link only the confirmed
   development project: `npx supabase link --project-ref <DEV_PROJECT_REF>`.
   Keep access tokens local; do not paste them into chat or source files.
3. Run `npx supabase migration list` and confirm the staff migration is
   recorded as applied. If the database was changed outside migrations, stop
   and reconcile migration history through the approved database-owner process.
4. Run `npx supabase db push --dry-run`. Confirm the only intended pending
   migration is `20261028120000_student_records_foundation.sql`; stop if the
   staff migration or any unexpected migration is pending.
5. After reviewing the SQL and confirming the preflight results, a project
   owner may explicitly run `npx supabase db push` against that linked
   development project. This repository does not run that command
   automatically.
6. Re-run the metadata queries and verify that anon has no student table
   privileges, authenticated has only the documented column-level writes,
   student RLS is enabled, and the active-staff policies and private audit
   table exist.

### Synthetic end-to-end verification

After applying to the test project and signing into the app as active staff:

1. Visit `/dashboard/students`; verify the directory loads without demo
   substitution.
2. Add a synthetic row with an ID such as `TEST-SIS-<unique-suffix>` and a
   clearly synthetic name. Search for it, open it, edit its name/status, reload
   the page, and confirm the saved values remain.
3. In SQL Editor, check only the audit metadata for that exact synthetic ID:

   ```sql
   select student_id, actor_id, action, changed_fields, occurred_at
   from public.student_record_audit
   where student_id = 'TEST-SIS-<unique-suffix>'
   order by occurred_at;
   ```

4. Confirm each successful insert/update has an audit entry. The trigger runs
   in the same transaction as the write, so trigger failure aborts the student
   operation rather than allowing an unaudited success.
5. As anon, attempt a zero-row select and a write through the REST API; both
   must be denied by privileges. As an authenticated user without an active
   staff profile, a select may return an empty result under RLS, but every
   attempted write must be denied. As active staff, confirm direct API
   operations remain constrained by RLS and the column grants: no delete, no
   ID update, and no timestamp or audit writes.
6. Sign in as an inactive staff profile and verify the dashboard redirects
   away and server actions reject access. Remove only the synthetic test row
   through the trusted test-project SQL Editor when verification is complete;
   do not run cleanup against production.

The project has no existing integration-test runner or authenticated test
fixtures. `npm run test:validation` exercises server-side input validation;
RLS, staff authorization, persistence, and trigger behavior remain manual
test-project checks until an authenticated integration environment is
available.
