-- READ-ONLY diagnostics for public.students. Run in the Supabase SQL Editor.
-- Returns metadata only, never student rows. Nothing here changes the database.
-- This file lives outside supabase/migrations/ on purpose so `db push` never runs it.

-- 1. Column-level privileges. information_schema.role_table_grants does NOT list
--    column-level grants, so a query against it can show only SELECT even when
--    INSERT/UPDATE were granted per column. Check this view instead.
select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'students'
  and grantee in ('authenticated', 'anon', 'PUBLIC')
order by grantee, privilege_type, column_name;

-- 2. Effective privileges for the authenticated role (true/false, no guessing).
select
  has_table_privilege('authenticated', 'public.students', 'INSERT') as table_insert,
  has_table_privilege('authenticated', 'public.students', 'UPDATE') as table_update,
  has_column_privilege('authenticated', 'public.students', 'student_id', 'INSERT') as col_insert_student_id,
  has_column_privilege('authenticated', 'public.students', 'full_name', 'INSERT') as col_insert_full_name,
  has_column_privilege('authenticated', 'public.students', 'enrollment_status', 'INSERT') as col_insert_status,
  has_column_privilege('authenticated', 'public.students', 'full_name', 'UPDATE') as col_update_full_name,
  has_column_privilege('authenticated', 'public.students', 'enrollment_status', 'UPDATE') as col_update_status;

-- 3. Policies, defaults, constraints and triggers that can affect a write.
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'students';

select column_name, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'students' order by ordinal_position;

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.students'::regclass;

select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid = 'public.students'::regclass and not tgisinternal;

-- 4. Is the helper used by the policies true for a given staff user?
--    (Replace the UUID with a staff user id you have verified.)
-- select exists (select 1 from public.staff_profiles
--                where user_id = '<STAFF_USER_UUID>'::uuid and is_active);

-- ---------------------------------------------------------------------------
-- ONLY IF query 2 returns false for the column privileges above, an owner may
-- review and run this minimal fix manually (it is NOT applied automatically):
--
--   grant insert (student_id, full_name, enrollment_status)
--     on table public.students to authenticated;
--   grant update (full_name, enrollment_status)
--     on table public.students to authenticated;
--
-- It adds no table-wide grants, no anon access, and does not touch RLS.
-- ---------------------------------------------------------------------------
