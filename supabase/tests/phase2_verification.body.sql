-- Phase 2 database verification (PL/pgSQL body). Do not run this file directly:
-- build_dry_run.sh wraps the migration plus this body into ONE `DO` statement,
-- which PostgreSQL executes atomically no matter how the client splits or sends
-- statements. It creates
-- fictional fixtures (fake staff users and TEST-* students), exercises RLS,
-- grants, constraints, triggers, RPCs and audit as each role, and then ends
-- with RAISE EXCEPTION so that PostgreSQL rolls EVERYTHING back (fixtures and
-- the migration itself). The result table is carried out in the exception text.

create schema t;
grant usage on schema t to anon, authenticated;
create table t.results (n serial, label text, ok boolean, detail text);
grant all on t.results to anon, authenticated;
grant usage on sequence t.results_n_seq to anon, authenticated;

-- Run p_sql as anon (p_uid null) or as authenticated user p_uid; expect either
-- success ('ok') or a specific SQLSTATE; optionally an exact affected/returned
-- row count. Runs inside a sub-block so a failure never aborts the suite.
create function t.try(
  p_label text, p_uid uuid, p_sql text,
  p_expect text default 'ok', p_rows bigint default null
) returns void language plpgsql as $$
declare st text := 'ok'; msg text; n bigint := null; good boolean;
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
  end if;
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when others then
    st := sqlstate; msg := sqlerrm; n := null;
  end;
  reset role;
  good := st = p_expect and (p_rows is null or n = p_rows);
  insert into t.results (label, ok, detail) values (
    p_label, good,
    'expected=' || p_expect || coalesce(' rows=' || p_rows, '') ||
    ' got=' || st || coalesce(' rows=' || n, '') ||
    coalesce(' msg=' || left(msg, 110), ''));
end $$;

-- Evaluate a boolean query as a role (or as the owner when p_uid is 'owner').
create function t.is_true(p_label text, p_uid uuid, p_sql text, p_owner boolean default false)
returns void language plpgsql as $$
declare v boolean; msg text;
begin
  if not p_owner then
    if p_uid is null then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      set local role anon;
    else
      perform set_config('request.jwt.claims',
        json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
      set local role authenticated;
    end if;
  end if;
  begin
    execute p_sql into v;
  exception when others then
    v := false; msg := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  insert into t.results (label, ok, detail)
  values (p_label, coalesce(v, false), coalesce(msg, 'value=' || coalesce(v::text, 'null')));
end $$;

-- Fictional fixtures: A active staff, B inactive staff profile, C no profile.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'staff-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b2', 'staff-b@example.invalid'),
  ('00000000-0000-4000-8000-0000000000c3', 'staff-c@example.invalid');
insert into public.staff_profiles (user_id, role, is_active) values
  ('00000000-0000-4000-8000-0000000000a1', 'office_staff', true),
  ('00000000-0000-4000-8000-0000000000b2', 'office_staff', false);

do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  c uuid := '00000000-0000-4000-8000-0000000000c3';
  class7 uuid; class8 uuid;
  full_payload jsonb := $j${
    "student_id":"TEST-0001","full_name":"Test Sokha Chan","full_name_km":"តេស្ត សុខា ចាន់",
    "date_of_birth":"2014-05-17","gender":"female","place_of_birth":"Phnom Penh",
    "nationality":"Cambodian","admission_date":"2024-10-01","enrollment_status":"active",
    "address_line":"House 12, Street 3","village":"Test Village","commune":"Test Commune",
    "district":"Test District","province":"Phnom Penh","address_notes":"Behind the test pagoda",
    "home_latitude":"11.5564","home_longitude":"104.9282"}$j$;
  guardian_ok jsonb := $j${"relationship":"mother","full_name_en":"Test Dara Chan",
    "full_name_km":"តេស្ត តារា ចាន់","phone":"+855123456789","phone_alt":"098765432",
    "email":"dara@example.invalid","occupation":"Teacher","lives_with_student":"true"}$j$;
  contact_ok jsonb := $j${"relationship":"Neighbour","full_name_en":"Test Neighbour",
    "phone":"011222333"}$j$;
begin
  -- ===== anon: nothing is reachable =====
  perform t.try('anon cannot read students', null, 'select * from public.students', '42501');
  perform t.try('anon cannot insert students', null,
    $q$insert into public.students (student_id, full_name) values ('TEST-ANON','x')$q$, '42501');
  perform t.try('anon cannot read student_directory', null, 'select * from public.student_directory', '42501');
  perform t.try('anon cannot read classes', null, 'select * from public.classes', '42501');
  perform t.try('anon cannot read guardians', null, 'select * from public.student_guardians', '42501');
  perform t.try('anon cannot read emergency contacts', null, 'select * from public.student_emergency_contacts', '42501');
  perform t.try('anon cannot read enrollments', null, 'select * from public.student_enrollments', '42501');
  perform t.try('anon cannot read preferences', null, 'select * from public.staff_preferences', '42501');
  perform t.try('anon cannot read audit', null, 'select * from public.student_record_audit', '42501');
  perform t.try('anon cannot call register_student', null,
    $q$select public.register_student('{"student_id":"TEST-ANON","full_name":"x"}'::jsonb)$q$, '42501');

  -- ===== active staff A: classes =====
  perform t.try('A creates class 7A', a,
    $q$insert into public.classes (school_year, grade_level, section, name_en, name_km)
       values ('2026-2027','Grade 7','A','Grade 7A','ថ្នាក់ទី ៧ក')$q$, 'ok', 1);
  perform t.try('A creates class 8A', a,
    $q$insert into public.classes (school_year, grade_level, section, name_en)
       values ('2026-2027','Grade 8','A','Grade 8A')$q$, 'ok', 1);
  perform t.try('duplicate class name in same year rejected', a,
    $q$insert into public.classes (school_year, grade_level, name_en)
       values ('2026-2027','Grade 7','Grade 7A')$q$, '23505');
  perform t.try('bad school_year format rejected', a,
    $q$insert into public.classes (school_year, grade_level, name_en) values ('2026','G','X')$q$, '23514');
  perform t.try('A cannot change a class school_year (column grant)', a,
    $q$update public.classes set school_year = '2027-2028'$q$, '42501');
  perform t.try('A can rename a class', a,
    $q$update public.classes set name_km = 'ថ្នាក់ពិសោធន៍' where name_en = 'Grade 8A'$q$, 'ok', 1);

  select id into class7 from public.classes where name_en = 'Grade 7A';
  select id into class8 from public.classes where name_en = 'Grade 8A';

  -- ===== registration RPC: happy path, minimal, duplicate, atomicity =====
  perform t.try('A registers full fictional student with guardian, contact and class', a,
    format($q$select public.register_student(%L::jsonb, %L::jsonb, %L::jsonb, %L::uuid)$q$,
      full_payload, guardian_ok, contact_ok, class7), 'ok');
  perform t.try('A registers minimal student (ID + English name only)', a,
    $q$select public.register_student('{"student_id":"TEST-0002","full_name":"Test Minimal Student"}'::jsonb)$q$, 'ok');
  perform t.try('duplicate student ID rejected', a,
    $q$select public.register_student('{"student_id":"TEST-0002","full_name":"Dup"}'::jsonb)$q$, '23505');
  perform t.try('registration with invalid guardian phone fails', a,
    $q$select public.register_student('{"student_id":"TEST-0003","full_name":"Test Atomic"}'::jsonb,
         '{"relationship":"father","full_name_en":"X","phone":"12"}'::jsonb)$q$, '23514');
  perform t.is_true('failed registration left no student behind (atomic)', a,
    $q$select not exists (select 1 from public.students where student_id = 'TEST-0003')$q$);
  perform t.try('registration with unknown class fails (FK)', a,
    $q$select public.register_student('{"student_id":"TEST-0004","full_name":"Test Class FK"}'::jsonb,
         null, null, '99999999-9999-4999-8999-999999999999'::uuid)$q$, '23503');
  perform t.is_true('failed class assignment left no student behind (atomic)', a,
    $q$select not exists (select 1 from public.students where student_id = 'TEST-0004')$q$);

  -- ===== constraints on direct writes =====
  perform t.try('leading space in name rejected', a,
    $q$insert into public.students (student_id, full_name) values ('TEST-0005',' Spaced')$q$, '23514');
  perform t.try('empty Khmer name rejected', a,
    $q$update public.students set full_name_km = '' where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('unknown gender rejected', a,
    $q$update public.students set gender = 'x' where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('unknown status rejected', a,
    $q$update public.students set enrollment_status = 'bogus' where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('new status vocabulary accepted (graduated)', a,
    $q$update public.students set enrollment_status = 'graduated' where student_id = 'TEST-0002'$q$, 'ok', 1);
  perform t.try('legacy status still accepted (inactive)', a,
    $q$update public.students set enrollment_status = 'inactive' where student_id = 'TEST-0002'$q$, 'ok', 1);
  perform t.try('latitude without longitude rejected', a,
    $q$update public.students set home_latitude = 11.5 where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('latitude 91 rejected', a,
    $q$update public.students set home_latitude = 91, home_longitude = 104 where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('numeric overflow in latitude rejected', a,
    $q$update public.students set home_latitude = 1000, home_longitude = 104 where student_id = 'TEST-0002'$q$, '22003');
  perform t.try('valid coordinates accepted', a,
    $q$update public.students set home_latitude = 11.556400, home_longitude = 104.928200 where student_id = 'TEST-0002'$q$, 'ok', 1);
  perform t.try('birth date before 1990 rejected', a,
    $q$update public.students set date_of_birth = '1985-01-01' where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('birth date in the future rejected (trigger)', a,
    $q$update public.students set date_of_birth = current_date + 2 where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('photo_path with path traversal rejected', a,
    $q$update public.students set photo_path = '../secret.jpg' where student_id = 'TEST-0002'$q$, '23514');
  perform t.try('photo_path with simple object name accepted', a,
    $q$update public.students set photo_path = 'a1b2c3d4-e5f6.jpg' where student_id = 'TEST-0002'$q$, 'ok', 1);
  perform t.try('over-long address line rejected', a,
    $q$update public.students set address_line = repeat('x', 201) where student_id = 'TEST-0002'$q$, '23514');

  -- ===== column grants: immutable / forbidden columns =====
  perform t.try('A cannot change student_id', a,
    $q$update public.students set student_id = 'TEST-9999' where student_id = 'TEST-0002'$q$, '42501');
  perform t.try('A cannot write created_at', a,
    $q$update public.students set created_at = now() where student_id = 'TEST-0002'$q$, '42501');
  perform t.try('A cannot delete students', a,
    $q$delete from public.students where student_id = 'TEST-0002'$q$, '42501');
  perform t.try('A cannot read or write the audit table', a, 'select * from public.student_record_audit', '42501');
  perform t.try('A cannot write the audit table', a,
    $q$insert into public.student_record_audit (student_id, actor_id, action, changed_fields) values ('x', gen_random_uuid(), 'insert', '{}')$q$, '42501');
  perform t.try('A cannot change an enrollment class (history is immutable)', a,
    $q$update public.student_enrollments set class_id = gen_random_uuid()$q$, '42501');
  perform t.try('A cannot delete enrollments', a, 'delete from public.student_enrollments', '42501');
  perform t.try('A cannot delete classes', a, 'delete from public.classes', '42501');

  -- ===== guardians / contacts =====
  perform t.try('second guardian can become primary', a,
    $q$insert into public.student_guardians (student_id, relationship, full_name_en, phone, is_primary)
       values ('TEST-0001','father','Test Vanna Chan','012999888', true)$q$, 'ok', 1);
  perform t.is_true('exactly one primary guardian after switch', a,
    $q$select count(*) = 1 and bool_and(is_primary = (full_name_en = 'Test Vanna Chan'))
       from public.student_guardians where student_id = 'TEST-0001' and is_primary$q$);
  perform t.try('guardian with neither name rejected', a,
    $q$insert into public.student_guardians (student_id, relationship, phone) values ('TEST-0001','other','012111222')$q$, '23514');
  perform t.try('guardian with invalid phone rejected', a,
    $q$insert into public.student_guardians (student_id, relationship, full_name_en, phone) values ('TEST-0001','other','X','abc')$q$, '23514');
  perform t.try('guardian with invalid email rejected', a,
    $q$insert into public.student_guardians (student_id, relationship, full_name_en, phone, email) values ('TEST-0001','other','X','012111222','nope')$q$, '23514');
  perform t.try('guardian with unknown relationship rejected', a,
    $q$insert into public.student_guardians (student_id, relationship, full_name_en, phone) values ('TEST-0001','cousin','X','012111222')$q$, '23514');
  perform t.try('guardian for a missing student rejected (FK)', a,
    $q$insert into public.student_guardians (student_id, relationship, full_name_en, phone) values ('NOPE','other','X','012111222')$q$, '23503');
  perform t.try('A edits a guardian phone', a,
    $q$update public.student_guardians set phone = '+855 12 000 111' where full_name_en = 'Test Vanna Chan'$q$, '23514');
  perform t.try('A edits a guardian phone (normalised)', a,
    $q$update public.student_guardians set phone = '+85512000111' where full_name_en = 'Test Vanna Chan'$q$, 'ok', 1);
  perform t.try('A cannot reassign a guardian to another student', a,
    $q$update public.student_guardians set student_id = 'TEST-0002'$q$, '42501');
  perform t.try('emergency contact priority out of range rejected', a,
    $q$insert into public.student_emergency_contacts (student_id, full_name_en, relationship, phone, priority)
       values ('TEST-0001','X','Aunt','012111222', 12)$q$, '23514');
  perform t.try('A adds a second emergency contact', a,
    $q$insert into public.student_emergency_contacts (student_id, full_name_km, relationship, phone, priority)
       values ('TEST-0001','តេស្ត មីង','Aunt','012111222', 2)$q$, 'ok', 1);
  perform t.try('A deletes that emergency contact', a,
    $q$delete from public.student_emergency_contacts where full_name_km = 'តេស្ត មីង'$q$, 'ok', 1);

  -- ===== enrollments =====
  perform t.try('second open enrollment for same student rejected', a,
    format($q$insert into public.student_enrollments (student_id, class_id) values ('TEST-0001', %L)$q$, class8), '23505');
  perform t.try('assign_student_class moves the student to 8A', a,
    format($q$select public.assign_student_class('TEST-0001', %L::uuid, current_date)$q$, class8), 'ok');
  perform t.is_true('exactly one current enrollment (8A) and 2 history rows', a,
    $q$select (select count(*) from public.student_enrollments where student_id='TEST-0001' and left_on is null) = 1
       and (select count(*) from public.student_enrollments where student_id='TEST-0001') = 2
       and (select c.name_en from public.student_enrollments e join public.classes c on c.id=e.class_id
            where e.student_id='TEST-0001' and e.left_on is null) = 'Grade 8A'$q$);
  perform t.try('left_on before enrolled_on rejected', a,
    $q$update public.student_enrollments set left_on = date '2000-01-01' where student_id='TEST-0001'$q$, '23514');
  perform t.try('assign_student_class to unknown class fails and keeps old enrollment', a,
    $q$select public.assign_student_class('TEST-0001', '99999999-9999-4999-8999-999999999999'::uuid)$q$, '23503');
  perform t.is_true('old enrollment still current after failed assignment', a,
    $q$select (select count(*) from public.student_enrollments where student_id='TEST-0001' and left_on is null) = 1$q$);
  perform t.try('end_student_enrollment closes the current class', a,
    $q$select public.end_student_enrollment('TEST-0001')$q$, 'ok');
  perform t.is_true('no current enrollment after ending', a,
    $q$select not exists (select 1 from public.student_enrollments where student_id='TEST-0001' and left_on is null)$q$);

  -- ===== directory view and search inputs =====
  perform t.try('assign again so directory has a class', a,
    format($q$select public.assign_student_class('TEST-0001', %L::uuid)$q$, class7), 'ok');
  perform t.is_true('directory row shows class, primary guardian, counts, phones', a,
    $q$select class_name_en = 'Grade 7A' and guardian_name_en = 'Test Vanna Chan'
         and guardian_count = 2 and emergency_contact_count = 1 and has_location
         and phones like '%+85512000111%' and phones like '%011222333%'
       from public.student_directory where student_id = 'TEST-0001'$q$);
  perform t.is_true('directory shows minimal student with zero counts and no class', a,
    $q$select class_id is null and guardian_count = 0 and not has_location is false
       from public.student_directory where student_id = 'TEST-0002'$q$);
  perform t.is_true('Khmer-name search matches', a,
    $q$select count(*) = 1 from public.student_directory where full_name_km ilike '%សុខា%'$q$);

  -- ===== staff A can update; updated_at moves =====
  perform t.try('A edits Khmer name', a,
    $q$update public.students set full_name_km = 'តេស្ត សុខា ចាន់ ២' where student_id = 'TEST-0001'$q$, 'ok', 1);
  -- now() is constant inside one transaction, so prove the trigger instead: even a
  -- stale value written by the owner is overwritten on update.
  update public.students set updated_at = timestamptz '2000-01-01' where student_id = 'TEST-0001';
  perform t.is_true('updated_at is maintained by the trigger, not the client', a,
    $q$select updated_at > timestamptz '2001-01-01' from public.students where student_id = 'TEST-0001'$q$);
  perform t.try('A cannot write updated_at directly (column grant)', a,
    $q$update public.students set updated_at = now() where student_id = 'TEST-0001'$q$, '42501');

  -- ===== inactive staff B and non-staff C =====
  perform t.try('B (inactive) reads zero students', b, 'select * from public.students', 'ok', 0);
  perform t.try('C (no profile) reads zero students', c, 'select * from public.students', 'ok', 0);
  perform t.try('B reads zero from directory view', b, 'select * from public.student_directory', 'ok', 0);
  perform t.try('C reads zero classes', c, 'select * from public.classes', 'ok', 0);
  perform t.try('B reads zero guardians', b, 'select * from public.student_guardians', 'ok', 0);
  perform t.try('B reads zero emergency contacts', b, 'select * from public.student_emergency_contacts', 'ok', 0);
  perform t.try('B reads zero enrollments', b, 'select * from public.student_enrollments', 'ok', 0);
  perform t.try('B cannot insert a student (RLS)', b,
    $q$insert into public.students (student_id, full_name) values ('TEST-B','x')$q$, '42501');
  perform t.try('C cannot register via RPC', c,
    $q$select public.register_student('{"student_id":"TEST-C","full_name":"x"}'::jsonb)$q$, '42501');
  perform t.try('B update affects zero rows', b,
    $q$update public.students set full_name_km = 'hijack'$q$, 'ok', 0);
  perform t.try('B cannot insert a guardian (RLS)', b,
    $q$insert into public.student_guardians (student_id, relationship, full_name_en, phone) values ('TEST-0001','other','X','012111222')$q$, '42501');
  perform t.try('B cannot delete guardians (zero rows)', b, 'delete from public.student_guardians', 'ok', 0);
  perform t.try('B cannot create a class', b,
    $q$insert into public.classes (school_year, grade_level, name_en) values ('2026-2027','G','BX')$q$, '42501');
  perform t.try('B cannot assign class via RPC', b,
    format($q$select public.assign_student_class('TEST-0001', %L::uuid)$q$, class8), '42501');

  -- ===== staff preferences =====
  perform t.try('A saves own language', a,
    format($q$insert into public.staff_preferences (user_id, language) values (%L, 'km')$q$, a), 'ok', 1);
  perform t.try('A cannot save a preference for someone else', a,
    format($q$insert into public.staff_preferences (user_id, language) values (%L, 'km')$q$, c), '42501');
  perform t.try('invalid language rejected', a,
    $q$update public.staff_preferences set language = 'fr'$q$, '23514');
  perform t.try('A switches own language', a,
    $q$update public.staff_preferences set language = 'en'$q$, 'ok', 1);
  perform t.try('A sees only their own preference row', a, 'select * from public.staff_preferences', 'ok', 1);
  perform t.try('inactive B cannot save a preference', b,
    format($q$insert into public.staff_preferences (user_id, language) values (%L, 'km')$q$, b), '42501');

  -- ===== guardian delete is allowed and audited =====
  perform t.try('A deletes a guardian', a,
    $q$delete from public.student_guardians where full_name_en = 'Test Vanna Chan'$q$, 'ok', 1);
end
$$;

-- ===== owner-level assertions: audit content, privileges, storage =====
perform t.is_true('audit has student insert + update rows by actor A', null,
  $q$select count(*) filter (where entity='student' and action='insert') >= 2
        and count(*) filter (where entity='student' and action='update') >= 1
        and bool_and(actor_id = '00000000-0000-4000-8000-0000000000a1')
     from public.student_record_audit where student_id in ('TEST-0001','TEST-0002')$q$, true);
perform t.is_true('audit covers guardian, emergency_contact, enrollment, and a delete', null,
  $q$select count(*) filter (where entity='guardian') > 0
        and count(*) filter (where entity='emergency_contact') > 0
        and count(*) filter (where entity='enrollment') > 0
        and count(*) filter (where action='delete') >= 2
     from public.student_record_audit where student_id = 'TEST-0001'$q$, true);
perform t.is_true('audit stores field names only, never student values', null,
  $q$select not exists (
       select 1 from public.student_record_audit a, unnest(a.changed_fields) f
       where f ilike '%Sokha%' or f ilike '%Dara%' or f ilike '%855%' or f ilike '%Phnom%')$q$, true);
perform t.is_true('audit records the changed field names for the Khmer-name edit', null,
  $q$select exists (select 1 from public.student_record_audit
       where student_id='TEST-0001' and action='update' and changed_fields = array['full_name_km'])$q$, true);
perform t.is_true('failed/rolled-back registrations left no audit rows', null,
  $q$select not exists (select 1 from public.student_record_audit where student_id in ('TEST-0003','TEST-0004'))$q$, true);

perform t.is_true('anon has no privilege on any new table or view', null,
  $q$select not exists (
       select 1 from unnest(array['classes','student_enrollments','student_guardians',
         'student_emergency_contacts','staff_preferences','student_directory','students','student_record_audit']) r
       where has_table_privilege('anon', 'public.' || r, 'SELECT,INSERT,UPDATE,DELETE'))$q$, true);
perform t.is_true('authenticated cannot delete classes/enrollments/students/audit', null,
  $q$select not exists (
       select 1 from unnest(array['classes','student_enrollments','students','student_record_audit','staff_preferences']) r
       where has_table_privilege('authenticated', 'public.' || r, 'DELETE'))$q$, true);
perform t.is_true('only the three RPCs are executable by authenticated; none by anon', null,
  $q$select (select array_agg(p.proname order by p.proname)
              from pg_proc p where p.pronamespace = 'public'::regnamespace
                and has_function_privilege('authenticated', p.oid, 'EXECUTE'))
            = array['assign_student_class','end_student_enrollment','has_staff_role','is_active_staff','register_student']::name[]
         and not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace
                and has_function_privilege('anon', p.oid, 'EXECUTE'))$q$, true);
perform t.is_true('every Phase 2 table has RLS enabled', null,
  $q$select bool_and(c.relrowsecurity) from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relname in ('classes','student_enrollments','student_guardians','student_emergency_contacts','staff_preferences','students','student_record_audit')$q$, true);
perform t.is_true('security definer audit helpers have an empty search_path and postgres owner', null,
  $q$select bool_and(p.prosecdef and pg_get_userbyid(p.proowner) = 'postgres' and p.proconfig @> array['search_path=""'])
     from pg_proc p where p.proname in ('audit_student_record_change','audit_student_child_change')
       and p.pronamespace = 'public'::regnamespace$q$, true);
perform t.is_true('student_directory is a security_invoker view', null,
  $q$select coalesce((select 'security_invoker=true' = any (reloptions) from pg_class where oid = 'public.student_directory'::regclass), false)$q$, true);

-- Storage (only meaningful where a storage schema exists)
perform t.is_true('student-photos bucket is private with size and type limits', null,
  $q$select coalesce((select not public and file_size_limit = 1048576
        and allowed_mime_types @> array['image/jpeg','image/png','image/webp']
        from storage.buckets where id = 'student-photos'), false)$q$, true);
perform t.try('A can add an object to student-photos', '00000000-0000-4000-8000-0000000000a1',
  $q$insert into storage.objects (bucket_id, name) values ('student-photos','test-a.jpg')$q$, 'ok', 1);
perform t.try('A cannot add an object to another bucket', '00000000-0000-4000-8000-0000000000a1',
  $q$insert into storage.objects (bucket_id, name) values ('avatars','test-a.jpg')$q$, '42501');
perform t.try('inactive B cannot add a photo object', '00000000-0000-4000-8000-0000000000b2',
  $q$insert into storage.objects (bucket_id, name) values ('student-photos','test-b.jpg')$q$, '42501');
perform t.try('anon cannot add a photo object', null,
  $q$insert into storage.objects (bucket_id, name) values ('student-photos','test-anon.jpg')$q$, '42501');
perform t.try('B sees zero photo objects', '00000000-0000-4000-8000-0000000000b2',
  $q$select * from storage.objects where bucket_id = 'student-photos'$q$, 'ok', 0);
perform t.try('A sees the photo object', '00000000-0000-4000-8000-0000000000a1',
  $q$select * from storage.objects where bucket_id = 'student-photos'$q$, 'ok', 1);

-- Report and roll everything back.
do $$
declare report text;
begin
  select string_agg(
           case when ok then 'PASS ' else 'FAIL ' end || label || ' | ' || detail,
           E'\n' order by n)
    || E'\nSUMMARY pass=' || count(*) filter (where ok)
    || ' fail=' || count(*) filter (where not ok) || ' total=' || count(*)
  into report from t.results;
  raise exception E'PHASE2_VERIFICATION_REPORT\n%', report;
end
$$;
