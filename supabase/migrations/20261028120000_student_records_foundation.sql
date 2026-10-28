do $$
declare
  helper_is_secure boolean;
  helper_owner_is_postgres boolean;
  helper_has_empty_search_path boolean;
begin
  if to_regclass('public.students') is not null then
    raise exception
      'public.students already exists; inspect its schema and security before applying this migration';
  end if;

  if to_regclass('public.student_record_audit') is not null
    or to_regprocedure('public.set_student_updated_at()') is not null
    or to_regprocedure('public.audit_student_record_change()') is not null
  then
    raise exception
      'A student audit relation or trigger function already exists; inspect the schema before applying this migration';
  end if;

  if to_regprocedure('public.is_active_staff()') is null then
    raise exception
      'public.is_active_staff() is required; apply and verify the staff authorization foundation first';
  end if;

  if to_regclass('public.staff_profiles') is null then
    raise exception
      'public.staff_profiles is required; apply and verify the staff authorization foundation first';
  end if;

  select
    procedure.prosecdef,
    pg_get_userbyid(procedure.proowner) = 'postgres',
    coalesce(procedure.proconfig @> array['search_path=""'], false)
  into
    helper_is_secure,
    helper_owner_is_postgres,
    helper_has_empty_search_path
  from pg_catalog.pg_proc as procedure
  where procedure.oid = to_regprocedure('public.is_active_staff()');

  if not coalesce(helper_is_secure, false)
    or not coalesce(helper_owner_is_postgres, false)
    or not coalesce(helper_has_empty_search_path, false)
  then
    raise exception
      'public.is_active_staff() must be the verified postgres-owned SECURITY DEFINER helper with an empty search_path';
  end if;
end
$$;

create table public.students (
  student_id text primary key
    check (
      student_id = btrim(student_id)
      and length(student_id) between 1 and 64
    ),
  full_name text not null
    check (
      full_name = btrim(full_name)
      and length(full_name) between 1 and 200
    ),
  enrollment_status text not null default 'active'
    check (enrollment_status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

revoke all on table public.students from public, anon, authenticated;
grant select on table public.students to authenticated;
grant insert (student_id, full_name, enrollment_status)
  on table public.students to authenticated;
grant update (full_name, enrollment_status)
  on table public.students to authenticated;

create policy students_select_active_staff
on public.students
for select
to authenticated
using ((select public.is_active_staff()));

create policy students_insert_active_staff
on public.students
for insert
to authenticated
with check ((select public.is_active_staff()));

create policy students_update_active_staff
on public.students
for update
to authenticated
using ((select public.is_active_staff()))
with check ((select public.is_active_staff()));

create table public.student_record_audit (
  id bigint generated always as identity primary key,
  student_id text not null,
  actor_id uuid not null,
  action text not null check (action in ('insert', 'update')),
  changed_fields text[] not null,
  occurred_at timestamptz not null default now()
);

alter table public.student_record_audit enable row level security;
revoke all on table public.student_record_audit from public, anon, authenticated;

create function public.set_student_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter function public.set_student_updated_at() owner to postgres;
revoke all on function public.set_student_updated_at() from public, anon, authenticated;

create trigger students_set_updated_at
before update on public.students
for each row
execute function public.set_student_updated_at();

create function public.audit_student_record_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_fields text[];
begin
  if tg_op = 'INSERT' then
    changed_fields := array['student_id', 'full_name', 'enrollment_status'];
  else
    select coalesce(array_agg(new_field.key order by new_field.key), array[]::text[])
    into changed_fields
    from jsonb_each(to_jsonb(new)) as new_field(key, value)
    where new_field.key not in ('updated_at')
      and (to_jsonb(old) -> new_field.key) is distinct from new_field.value;
  end if;

  insert into public.student_record_audit (
    student_id,
    actor_id,
    action,
    changed_fields
  )
  values (
    new.student_id,
    auth.uid(),
    lower(tg_op),
    changed_fields
  );

  return new;
end;
$$;

alter function public.audit_student_record_change() owner to postgres;
revoke all on function public.audit_student_record_change() from public, anon, authenticated;

create trigger students_audit_record_changes
after insert or update on public.students
for each row
execute function public.audit_student_record_change();

comment on table public.students is
  'Initial staff-only student directory. Active/inactive are provisional status values pending school confirmation.';
comment on column public.students.student_id is
  'Stable school-assigned identifier; no identifier format is enforced by this schema.';
comment on table public.student_record_audit is
  'Private audit metadata for student inserts and updates; stores changed field names, not student field values.';
