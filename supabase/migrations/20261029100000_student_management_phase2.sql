-- Phase 2: complete student management schema.
--
-- FORWARD-ONLY and ADDITIVE. This migration extends the tables that already
-- exist in the live project (public.students, public.student_record_audit,
-- public.staff_profiles and the helper functions from the earlier migrations).
-- It never creates public.students, never drops a table or column, and never
-- deletes rows. The only constraint it replaces is the enrollment_status
-- vocabulary check, which is widened (every previously valid value stays valid).
--
-- Verified base state (read-only audit of the live project, 2026-10-29): the
-- live schema equals 20261028120000_student_records_foundation.sql, with 0
-- student rows and no recorded migration history. The guard below refuses to
-- run against anything else, and refuses to run twice.

do $$
begin
  if to_regclass('public.students') is null
    or to_regclass('public.student_record_audit') is null
    or to_regclass('public.staff_profiles') is null
  then
    raise exception
      'Phase 2 expects public.students, public.student_record_audit and public.staff_profiles to exist';
  end if;

  if to_regprocedure('public.is_active_staff()') is null
    or to_regprocedure('public.audit_student_record_change()') is null
  then
    raise exception
      'Phase 2 expects public.is_active_staff() and public.audit_student_record_change() to exist';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name in ('full_name_km', 'date_of_birth', 'photo_path')
  ) or to_regclass('public.classes') is not null
    or to_regclass('public.student_guardians') is not null
  then
    raise exception
      'Phase 2 objects already exist; this migration must only be applied once';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Extend public.students
-- ---------------------------------------------------------------------------
-- full_name keeps its meaning (the Latin-script / English name, required).
alter table public.students
  add column full_name_km text,
  add column date_of_birth date,
  add column gender text,
  add column place_of_birth text,
  add column nationality text,
  add column admission_date date,
  add column photo_path text,
  add column address_line text,
  add column village text,
  add column commune text,
  add column district text,
  add column province text,
  add column address_notes text,
  add column home_latitude numeric(9, 6),
  add column home_longitude numeric(9, 6);

alter table public.students
  add constraint students_full_name_km_check check (
    full_name_km is null
    or (full_name_km = btrim(full_name_km) and length(full_name_km) between 1 and 200)
  ),
  add constraint students_date_of_birth_check check (
    date_of_birth is null or date_of_birth >= date '1990-01-01'
  ),
  add constraint students_gender_check check (
    gender is null or gender in ('female', 'male')
  ),
  add constraint students_place_of_birth_check check (
    place_of_birth is null
    or (place_of_birth = btrim(place_of_birth) and length(place_of_birth) between 1 and 120)
  ),
  add constraint students_nationality_check check (
    nationality is null
    or (nationality = btrim(nationality) and length(nationality) between 1 and 80)
  ),
  add constraint students_admission_date_check check (
    admission_date is null or admission_date >= date '1990-01-01'
  ),
  add constraint students_photo_path_check check (
    photo_path is null
    or (length(photo_path) between 5 and 120 and photo_path ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$')
  ),
  add constraint students_address_line_check check (
    address_line is null
    or (address_line = btrim(address_line) and length(address_line) between 1 and 200)
  ),
  add constraint students_village_check check (
    village is null
    or (village = btrim(village) and length(village) between 1 and 120)
  ),
  add constraint students_commune_check check (
    commune is null
    or (commune = btrim(commune) and length(commune) between 1 and 120)
  ),
  add constraint students_district_check check (
    district is null
    or (district = btrim(district) and length(district) between 1 and 120)
  ),
  add constraint students_province_check check (
    province is null
    or (province = btrim(province) and length(province) between 1 and 120)
  ),
  add constraint students_address_notes_check check (
    address_notes is null
    or (address_notes = btrim(address_notes) and length(address_notes) between 1 and 300)
  ),
  add constraint students_home_location_check check (
    (home_latitude is null and home_longitude is null)
    or (
      home_latitude is not null
      and home_longitude is not null
      and home_latitude between -90 and 90
      and home_longitude between -180 and 180
    )
  );

-- Widen the provisional status vocabulary. 'active' and 'inactive' remain valid.
-- The school still has to confirm the official list.
alter table public.students drop constraint students_enrollment_status_check;
alter table public.students
  add constraint students_enrollment_status_check check (
    enrollment_status in (
      'pending', 'active', 'on_leave', 'graduated', 'transferred', 'withdrawn', 'inactive'
    )
  );

comment on column public.students.full_name is
  'English / Latin-script full name (required). Khmer name is full_name_km.';
comment on column public.students.photo_path is
  'Object name inside the private student-photos Storage bucket; never a public URL.';
comment on column public.students.home_latitude is
  'WGS84 latitude of the home, set together with home_longitude or not at all.';

-- Business-rule checks that cannot be CHECK constraints (they depend on today).
create function public.validate_student_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today_pp date := (now() at time zone 'Asia/Phnom_Penh')::date;
begin
  if new.date_of_birth is not null and new.date_of_birth > today_pp then
    raise exception 'date_of_birth cannot be in the future'
      using errcode = '23514', constraint = 'students_date_of_birth_future';
  end if;
  return new;
end;
$$;

alter function public.validate_student_row() owner to postgres;
revoke all on function public.validate_student_row() from public, anon, authenticated;

create trigger students_validate_row
before insert or update on public.students
for each row
execute function public.validate_student_row();

-- Column privileges: extend the existing column-level grants. No table-wide
-- write grant, no delete, student_id and timestamps remain read-only.
grant insert (
  full_name_km, date_of_birth, gender, place_of_birth, nationality, admission_date,
  photo_path, address_line, village, commune, district, province, address_notes,
  home_latitude, home_longitude
) on table public.students to authenticated;

grant update (
  full_name_km, date_of_birth, gender, place_of_birth, nationality, admission_date,
  photo_path, address_line, village, commune, district, province, address_notes,
  home_latitude, home_longitude
) on table public.students to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Generic helper for updated_at on the new tables
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter function public.touch_updated_at() owner to postgres;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Classes and enrollments
-- ---------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_year text not null check (school_year ~ '^[0-9]{4}-[0-9]{4}$'),
  grade_level text not null
    check (grade_level = btrim(grade_level) and length(grade_level) between 1 and 40),
  section text
    check (section is null or (section = btrim(section) and length(section) between 1 and 20)),
  name_en text not null
    check (name_en = btrim(name_en) and length(name_en) between 1 and 80),
  name_km text
    check (name_km is null or (name_km = btrim(name_km) and length(name_km) between 1 and 80)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_school_year_name_key unique (school_year, name_en)
);

create trigger classes_touch_updated_at
before update on public.classes
for each row execute function public.touch_updated_at();

create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students (student_id) on delete restrict,
  class_id uuid not null references public.classes (id) on delete restrict,
  enrolled_on date not null default ((now() at time zone 'Asia/Phnom_Penh')::date),
  left_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_enrollments_dates_check
    check (left_on is null or left_on >= enrolled_on),
  constraint student_enrollments_enrolled_on_check
    check (enrolled_on >= date '1990-01-01')
);

-- A student has at most one current class (left_on is null).
create unique index student_enrollments_one_current
  on public.student_enrollments (student_id) where left_on is null;
create index student_enrollments_class_idx on public.student_enrollments (class_id);
create index student_enrollments_student_idx
  on public.student_enrollments (student_id, enrolled_on desc);

create trigger student_enrollments_touch_updated_at
before update on public.student_enrollments
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Guardians and emergency contacts
-- ---------------------------------------------------------------------------
create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students (student_id) on delete restrict,
  relationship text not null check (
    relationship in ('father', 'mother', 'grandparent', 'uncle_aunt', 'sibling', 'legal_guardian', 'other')
  ),
  full_name_en text
    check (full_name_en is null or (full_name_en = btrim(full_name_en) and length(full_name_en) between 1 and 200)),
  full_name_km text
    check (full_name_km is null or (full_name_km = btrim(full_name_km) and length(full_name_km) between 1 and 200)),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  phone_alt text check (phone_alt is null or phone_alt ~ '^\+?[0-9]{8,15}$'),
  email text check (
    email is null
    or (length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  ),
  occupation text
    check (occupation is null or (occupation = btrim(occupation) and length(occupation) between 1 and 100)),
  is_primary boolean not null default false,
  lives_with_student boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_guardians_name_check
    check (full_name_en is not null or full_name_km is not null)
);

create unique index student_guardians_one_primary
  on public.student_guardians (student_id) where is_primary;
create index student_guardians_student_idx on public.student_guardians (student_id);

create function public.enforce_single_primary_guardian()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_primary then
    update public.student_guardians
    set is_primary = false
    where student_id = new.student_id
      and id <> new.id
      and is_primary;
  end if;
  return new;
end;
$$;

alter function public.enforce_single_primary_guardian() owner to postgres;
revoke all on function public.enforce_single_primary_guardian()
  from public, anon, authenticated;

create trigger student_guardians_single_primary
before insert or update of is_primary on public.student_guardians
for each row execute function public.enforce_single_primary_guardian();

create trigger student_guardians_touch_updated_at
before update on public.student_guardians
for each row execute function public.touch_updated_at();

create table public.student_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students (student_id) on delete restrict,
  full_name_en text
    check (full_name_en is null or (full_name_en = btrim(full_name_en) and length(full_name_en) between 1 and 200)),
  full_name_km text
    check (full_name_km is null or (full_name_km = btrim(full_name_km) and length(full_name_km) between 1 and 200)),
  relationship text not null
    check (relationship = btrim(relationship) and length(relationship) between 1 and 60),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  phone_alt text check (phone_alt is null or phone_alt ~ '^\+?[0-9]{8,15}$'),
  priority smallint not null default 1 check (priority between 1 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_emergency_contacts_name_check
    check (full_name_en is not null or full_name_km is not null)
);

create index student_emergency_contacts_student_idx
  on public.student_emergency_contacts (student_id, priority);

create trigger student_emergency_contacts_touch_updated_at
before update on public.student_emergency_contacts
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Per-user language preference
-- ---------------------------------------------------------------------------
create table public.staff_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'km')),
  updated_at timestamptz not null default now()
);

create trigger staff_preferences_touch_updated_at
before update on public.staff_preferences
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Privileges and row level security for every new table
-- ---------------------------------------------------------------------------
-- Supabase's default privileges may auto-grant new public objects to anon and
-- authenticated, so every table starts from "revoke all" exactly like the
-- earlier migrations, then receives only the grants listed here.
alter table public.classes enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_emergency_contacts enable row level security;
alter table public.staff_preferences enable row level security;

revoke all on table public.classes from public, anon, authenticated;
revoke all on table public.student_enrollments from public, anon, authenticated;
revoke all on table public.student_guardians from public, anon, authenticated;
revoke all on table public.student_emergency_contacts from public, anon, authenticated;
revoke all on table public.staff_preferences from public, anon, authenticated;

grant select on table public.classes to authenticated;
grant insert (school_year, grade_level, section, name_en, name_km, is_active)
  on table public.classes to authenticated;
grant update (grade_level, section, name_en, name_km, is_active)
  on table public.classes to authenticated;

grant select on table public.student_enrollments to authenticated;
grant insert (student_id, class_id, enrolled_on)
  on table public.student_enrollments to authenticated;
grant update (left_on) on table public.student_enrollments to authenticated;

grant select, delete on table public.student_guardians to authenticated;
grant insert (
  student_id, relationship, full_name_en, full_name_km, phone, phone_alt,
  email, occupation, is_primary, lives_with_student
) on table public.student_guardians to authenticated;
grant update (
  relationship, full_name_en, full_name_km, phone, phone_alt,
  email, occupation, is_primary, lives_with_student
) on table public.student_guardians to authenticated;

grant select, delete on table public.student_emergency_contacts to authenticated;
grant insert (
  student_id, full_name_en, full_name_km, relationship, phone, phone_alt, priority
) on table public.student_emergency_contacts to authenticated;
grant update (
  full_name_en, full_name_km, relationship, phone, phone_alt, priority
) on table public.student_emergency_contacts to authenticated;

grant select on table public.staff_preferences to authenticated;
grant insert (user_id, language) on table public.staff_preferences to authenticated;
grant update (language) on table public.staff_preferences to authenticated;

-- Staff data tables: active staff only (same helper as public.students).
create policy classes_select_active_staff on public.classes
  for select to authenticated using ((select public.is_active_staff()));
create policy classes_insert_active_staff on public.classes
  for insert to authenticated with check ((select public.is_active_staff()));
create policy classes_update_active_staff on public.classes
  for update to authenticated
  using ((select public.is_active_staff()))
  with check ((select public.is_active_staff()));

create policy student_enrollments_select_active_staff on public.student_enrollments
  for select to authenticated using ((select public.is_active_staff()));
create policy student_enrollments_insert_active_staff on public.student_enrollments
  for insert to authenticated with check ((select public.is_active_staff()));
create policy student_enrollments_update_active_staff on public.student_enrollments
  for update to authenticated
  using ((select public.is_active_staff()))
  with check ((select public.is_active_staff()));

create policy student_guardians_select_active_staff on public.student_guardians
  for select to authenticated using ((select public.is_active_staff()));
create policy student_guardians_insert_active_staff on public.student_guardians
  for insert to authenticated with check ((select public.is_active_staff()));
create policy student_guardians_update_active_staff on public.student_guardians
  for update to authenticated
  using ((select public.is_active_staff()))
  with check ((select public.is_active_staff()));
create policy student_guardians_delete_active_staff on public.student_guardians
  for delete to authenticated using ((select public.is_active_staff()));

create policy student_emergency_contacts_select_active_staff on public.student_emergency_contacts
  for select to authenticated using ((select public.is_active_staff()));
create policy student_emergency_contacts_insert_active_staff on public.student_emergency_contacts
  for insert to authenticated with check ((select public.is_active_staff()));
create policy student_emergency_contacts_update_active_staff on public.student_emergency_contacts
  for update to authenticated
  using ((select public.is_active_staff()))
  with check ((select public.is_active_staff()));
create policy student_emergency_contacts_delete_active_staff on public.student_emergency_contacts
  for delete to authenticated using ((select public.is_active_staff()));

-- A staff member reads and writes only their own preference row.
create policy staff_preferences_select_own on public.staff_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_staff()));
create policy staff_preferences_insert_own on public.staff_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_active_staff()));
create policy staff_preferences_update_own on public.staff_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_active_staff()))
  with check ((select auth.uid()) = user_id and (select public.is_active_staff()));

-- ---------------------------------------------------------------------------
-- 7. Audit: extend the private audit table to cover the new tables
-- ---------------------------------------------------------------------------
alter table public.student_record_audit
  add column entity text not null default 'student',
  add column entity_id text;

alter table public.student_record_audit
  drop constraint student_record_audit_action_check;
alter table public.student_record_audit
  add constraint student_record_audit_action_check
    check (action in ('insert', 'update', 'delete')),
  add constraint student_record_audit_entity_check
    check (entity in ('student', 'guardian', 'emergency_contact', 'enrollment'));

-- Same behaviour as before (field NAMES only, never values), but the insert case
-- now lists every populated column instead of three hard-coded names.
create or replace function public.audit_student_record_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_fields text[];
begin
  if tg_op = 'INSERT' then
    select coalesce(array_agg(field.key order by field.key), array[]::text[])
    into changed_fields
    from jsonb_each(to_jsonb(new)) as field(key, value)
    where field.key not in ('created_at', 'updated_at')
      and field.value <> 'null'::jsonb;
  else
    select coalesce(array_agg(field.key order by field.key), array[]::text[])
    into changed_fields
    from jsonb_each(to_jsonb(new)) as field(key, value)
    where field.key not in ('created_at', 'updated_at')
      and (to_jsonb(old) -> field.key) is distinct from field.value;
  end if;

  insert into public.student_record_audit
    (student_id, actor_id, action, changed_fields, entity, entity_id)
  values
    (new.student_id, auth.uid(), lower(tg_op), changed_fields, 'student', new.student_id);

  return new;
end;
$$;

create function public.audit_student_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entity_name text;
  changed_fields text[];
begin
  entity_name := case tg_table_name
    when 'student_guardians' then 'guardian'
    when 'student_emergency_contacts' then 'emergency_contact'
    when 'student_enrollments' then 'enrollment'
  end;

  if tg_op = 'DELETE' then
    insert into public.student_record_audit
      (student_id, actor_id, action, changed_fields, entity, entity_id)
    values
      (old.student_id, auth.uid(), 'delete', array['*']::text[], entity_name, old.id::text);
    return old;
  elsif tg_op = 'INSERT' then
    select coalesce(array_agg(field.key order by field.key), array[]::text[])
    into changed_fields
    from jsonb_each(to_jsonb(new)) as field(key, value)
    where field.key not in ('created_at', 'updated_at')
      and field.value <> 'null'::jsonb;
  else
    select coalesce(array_agg(field.key order by field.key), array[]::text[])
    into changed_fields
    from jsonb_each(to_jsonb(new)) as field(key, value)
    where field.key not in ('created_at', 'updated_at')
      and (to_jsonb(old) -> field.key) is distinct from field.value;
  end if;

  insert into public.student_record_audit
    (student_id, actor_id, action, changed_fields, entity, entity_id)
  values
    (new.student_id, auth.uid(), lower(tg_op), changed_fields, entity_name, new.id::text);
  return new;
end;
$$;

alter function public.audit_student_child_change() owner to postgres;
revoke all on function public.audit_student_child_change() from public, anon, authenticated;

create trigger student_guardians_audit
after insert or update or delete on public.student_guardians
for each row execute function public.audit_student_child_change();

create trigger student_emergency_contacts_audit
after insert or update or delete on public.student_emergency_contacts
for each row execute function public.audit_student_child_change();

create trigger student_enrollments_audit
after insert or update or delete on public.student_enrollments
for each row execute function public.audit_student_child_change();

-- ---------------------------------------------------------------------------
-- 8. Directory view (RLS of the caller applies: security_invoker)
-- ---------------------------------------------------------------------------
create view public.student_directory
with (security_invoker = true)
as
select
  s.student_id,
  s.full_name,
  s.full_name_km,
  s.gender,
  s.date_of_birth,
  s.enrollment_status,
  s.photo_path,
  s.updated_at,
  (s.home_latitude is not null) as has_location,
  e.class_id,
  c.name_en as class_name_en,
  c.name_km as class_name_km,
  c.grade_level,
  c.school_year,
  g.full_name_en as guardian_name_en,
  g.full_name_km as guardian_name_km,
  g.phone as guardian_phone,
  coalesce(gc.total, 0)::int as guardian_count,
  coalesce(ec.total, 0)::int as emergency_contact_count,
  coalesce(ph.phones, '') as phones
from public.students as s
left join public.student_enrollments as e
  on e.student_id = s.student_id and e.left_on is null
left join public.classes as c on c.id = e.class_id
left join lateral (
  select x.full_name_en, x.full_name_km, x.phone
  from public.student_guardians as x
  where x.student_id = s.student_id
  order by x.is_primary desc, x.created_at asc
  limit 1
) as g on true
left join lateral (
  select count(*) as total from public.student_guardians as x
  where x.student_id = s.student_id
) as gc on true
left join lateral (
  select count(*) as total from public.student_emergency_contacts as x
  where x.student_id = s.student_id
) as ec on true
left join lateral (
  select string_agg(p.phone, ' ') as phones
  from (
    select x.phone from public.student_guardians as x where x.student_id = s.student_id
    union all
    select x.phone_alt from public.student_guardians as x
      where x.student_id = s.student_id and x.phone_alt is not null
    union all
    select x.phone from public.student_emergency_contacts as x where x.student_id = s.student_id
    union all
    select x.phone_alt from public.student_emergency_contacts as x
      where x.student_id = s.student_id and x.phone_alt is not null
  ) as p
) as ph on true;

revoke all on table public.student_directory from public, anon, authenticated;
grant select on table public.student_directory to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Atomic operations (SECURITY INVOKER: the caller's RLS and grants apply)
-- ---------------------------------------------------------------------------
create function public.register_student(
  p_student jsonb,
  p_guardian jsonb default null,
  p_contact jsonb default null,
  p_class_id uuid default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_student_id text := p_student ->> 'student_id';
begin
  insert into public.students (
    student_id, full_name, full_name_km, date_of_birth, gender, place_of_birth,
    nationality, admission_date, enrollment_status, photo_path, address_line,
    village, commune, district, province, address_notes, home_latitude, home_longitude
  ) values (
    new_student_id,
    p_student ->> 'full_name',
    nullif(p_student ->> 'full_name_km', ''),
    nullif(p_student ->> 'date_of_birth', '')::date,
    nullif(p_student ->> 'gender', ''),
    nullif(p_student ->> 'place_of_birth', ''),
    nullif(p_student ->> 'nationality', ''),
    nullif(p_student ->> 'admission_date', '')::date,
    coalesce(nullif(p_student ->> 'enrollment_status', ''), 'active'),
    nullif(p_student ->> 'photo_path', ''),
    nullif(p_student ->> 'address_line', ''),
    nullif(p_student ->> 'village', ''),
    nullif(p_student ->> 'commune', ''),
    nullif(p_student ->> 'district', ''),
    nullif(p_student ->> 'province', ''),
    nullif(p_student ->> 'address_notes', ''),
    nullif(p_student ->> 'home_latitude', '')::numeric,
    nullif(p_student ->> 'home_longitude', '')::numeric
  );

  if p_guardian is not null and jsonb_typeof(p_guardian) = 'object' then
    insert into public.student_guardians (
      student_id, relationship, full_name_en, full_name_km, phone, phone_alt,
      email, occupation, is_primary, lives_with_student
    ) values (
      new_student_id,
      p_guardian ->> 'relationship',
      nullif(p_guardian ->> 'full_name_en', ''),
      nullif(p_guardian ->> 'full_name_km', ''),
      p_guardian ->> 'phone',
      nullif(p_guardian ->> 'phone_alt', ''),
      nullif(p_guardian ->> 'email', ''),
      nullif(p_guardian ->> 'occupation', ''),
      true,
      nullif(p_guardian ->> 'lives_with_student', '')::boolean
    );
  end if;

  if p_contact is not null and jsonb_typeof(p_contact) = 'object' then
    insert into public.student_emergency_contacts (
      student_id, full_name_en, full_name_km, relationship, phone, phone_alt, priority
    ) values (
      new_student_id,
      nullif(p_contact ->> 'full_name_en', ''),
      nullif(p_contact ->> 'full_name_km', ''),
      p_contact ->> 'relationship',
      p_contact ->> 'phone',
      nullif(p_contact ->> 'phone_alt', ''),
      1
    );
  end if;

  if p_class_id is not null then
    insert into public.student_enrollments (student_id, class_id)
    values (new_student_id, p_class_id);
  end if;

  return new_student_id;
end;
$$;

create function public.assign_student_class(
  p_student_id text,
  p_class_id uuid,
  p_on date default ((now() at time zone 'Asia/Phnom_Penh')::date)
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  -- Close the current class (if any), then open the new one. Both statements run
  -- in the caller's transaction, so a failure leaves the old enrollment intact.
  update public.student_enrollments
  set left_on = greatest(p_on, enrolled_on)
  where student_id = p_student_id and left_on is null;

  insert into public.student_enrollments (student_id, class_id, enrolled_on)
  values (p_student_id, p_class_id, p_on)
  returning id into new_id;

  return new_id;
end;
$$;

create function public.end_student_enrollment(
  p_student_id text,
  p_on date default ((now() at time zone 'Asia/Phnom_Penh')::date)
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  closed integer;
begin
  update public.student_enrollments
  set left_on = greatest(p_on, enrolled_on)
  where student_id = p_student_id and left_on is null;
  get diagnostics closed = row_count;
  return closed;
end;
$$;

revoke all on function public.register_student(jsonb, jsonb, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.assign_student_class(text, uuid, date)
  from public, anon, authenticated;
revoke all on function public.end_student_enrollment(text, date)
  from public, anon, authenticated;
grant execute on function public.register_student(jsonb, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.assign_student_class(text, uuid, date) to authenticated;
grant execute on function public.end_student_enrollment(text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Private photo storage (skipped automatically where Storage is absent)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not present: student-photos bucket and policies skipped';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'student-photos', 'student-photos', false, 1048576,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do nothing;

  execute $p$
    create policy student_photos_select_active_staff on storage.objects
    for select to authenticated
    using (bucket_id = 'student-photos' and (select public.is_active_staff()))
  $p$;
  execute $p$
    create policy student_photos_insert_active_staff on storage.objects
    for insert to authenticated
    with check (bucket_id = 'student-photos' and (select public.is_active_staff()))
  $p$;
  execute $p$
    create policy student_photos_update_active_staff on storage.objects
    for update to authenticated
    using (bucket_id = 'student-photos' and (select public.is_active_staff()))
    with check (bucket_id = 'student-photos' and (select public.is_active_staff()))
  $p$;
  execute $p$
    create policy student_photos_delete_active_staff on storage.objects
    for delete to authenticated
    using (bucket_id = 'student-photos' and (select public.is_active_staff()))
  $p$;
end
$$;

comment on table public.classes is
  'Class groups per school year. Grade levels and naming are free text until the school confirms its structure.';
comment on table public.student_enrollments is
  'Class history. left_on is null for the current class; at most one current row per student.';
comment on table public.student_guardians is
  'Parents/guardians. Phone numbers are stored normalised (digits with optional leading +).';
comment on table public.student_emergency_contacts is
  'Emergency contacts, ordered by priority (1 = call first).';
comment on view public.student_directory is
  'Read model for the directory. security_invoker: RLS of the calling staff member applies.';
