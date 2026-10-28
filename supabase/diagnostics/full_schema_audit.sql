-- READ-ONLY full schema audit for the SIS. Run each block in the Supabase
-- SQL Editor of the project that the deployed site uses.
-- Returns metadata only: no student, guardian or staff rows. Changes nothing.
-- Lives outside supabase/migrations/ so `db push` never runs it.
-- Send back the RESULT TABLES (or screenshots of them). Never paste keys.

-- A. Every table/view/function in public and its RLS state.
select c.relname, c.relkind, c.relrowsecurity as rls_on, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p','v','m','f')
order by c.relname;

-- B. Columns of every public table (students, and anything else that exists).
select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- C. Constraints (checks, keys, foreign keys) and indexes.
select conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace = 'public'::regnamespace
order by 1, 2;

select tablename, indexname, indexdef from pg_indexes
where schemaname = 'public' order by tablename, indexname;

-- D. Policies and triggers.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select tgrelid::regclass as table_name, tgname, pg_get_triggerdef(oid) as definition
from pg_trigger where not tgisinternal and tgrelid::regclass::text like 'public.%'
order by 1, 2;

-- E. Table AND column privileges for anon / authenticated / PUBLIC.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated','PUBLIC')
order by table_name, grantee, privilege_type;

select table_name, grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and grantee in ('anon','authenticated','PUBLIC')
order by table_name, grantee, privilege_type, column_name;

-- F. Functions in public, their owner, SECURITY DEFINER flag and who can run them.
select p.proname, pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
       p.proconfig as settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authed_exec
from pg_proc p where p.pronamespace = 'public'::regnamespace order by p.proname;

-- G. Storage buckets (names and public flag only) and storage policies.
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by name;
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'storage' order by policyname;

-- H. Which migrations has Supabase recorded as applied?
select version, name from supabase_migrations.schema_migrations order by version;

-- I. Counts only (no rows): how many students / staff exist.
select (select count(*) from public.students) as students,
       (select count(*) from public.staff_profiles) as staff_profiles,
       (select count(*) from public.staff_profiles where is_active) as active_staff;
