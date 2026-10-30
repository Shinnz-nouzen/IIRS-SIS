-- Compact live smoke test (PL/pgSQL body; see build_live_smoke.sh). Fictional data only,
-- everything is rolled back by the final RAISE EXCEPTION.
create schema t;
grant usage on schema t to anon, authenticated;
create table t.results (n serial, label text, ok boolean, detail text);
grant all on t.results to anon, authenticated;
grant usage on sequence t.results_n_seq to anon, authenticated;
create function t.try(p_label text, p_uid uuid, p_sql text, p_expect text default 'ok', p_rows bigint default null)
returns void language plpgsql as $$
declare st text := 'ok'; msg text; n bigint := null; good boolean;
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
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
  insert into t.results (label, ok, detail) values (p_label, good,
    'expected=' || p_expect || coalesce(' rows=' || p_rows, '') || ' got=' || st || coalesce(' rows=' || n, '') || coalesce(' msg=' || left(msg, 100), ''));
end $$;
create function t.is_true(p_label text, p_sql text) returns void language plpgsql as $$
declare v boolean; msg text;
begin
  begin execute p_sql into v; exception when others then v := false; msg := sqlstate || ' ' || sqlerrm; end;
  insert into t.results (label, ok, detail) values (p_label, coalesce(v, false), coalesce(msg, 'value=' || coalesce(v::text, 'null')));
end $$;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'staff-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b2', 'staff-b@example.invalid');
insert into public.staff_profiles (user_id, role, is_active) values
  ('00000000-0000-4000-8000-0000000000a1', 'office_staff', true),
  ('00000000-0000-4000-8000-0000000000b2', 'office_staff', false);
do $$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b2';
  cls uuid;
begin
  perform t.try('anon: students', null, 'select * from public.students', '42501');
  perform t.try('anon: student_directory', null, 'select * from public.student_directory', '42501');
  perform t.try('anon: classes', null, 'select * from public.classes', '42501');
  perform t.try('anon: guardians', null, 'select * from public.student_guardians', '42501');
  perform t.try('anon: emergency contacts', null, 'select * from public.student_emergency_contacts', '42501');
  perform t.try('anon: enrollments', null, 'select * from public.student_enrollments', '42501');
  perform t.try('anon: preferences', null, 'select * from public.staff_preferences', '42501');
  perform t.try('anon: audit', null, 'select * from public.student_record_audit', '42501');
  perform t.try('anon: register_student RPC', null, $q$select public.register_student('{"student_id":"T-ANON","full_name":"x"}'::jsonb)$q$, '42501');
  perform t.try('staff A creates a class', a, $q$insert into public.classes (school_year, grade_level, name_en) values ('2026-2027','Grade 7','Grade 7A')$q$, 'ok', 1);
  select id into cls from public.classes where name_en = 'Grade 7A';
  perform t.try('staff A registers a full fictional student via RPC', a, format(
    $q$select public.register_student('{"student_id":"TEST-0001","full_name":"Test Sokha Chan","full_name_km":"តេស្ត សុខា","date_of_birth":"2014-05-17","gender":"female","enrollment_status":"active","province":"Phnom Penh","home_latitude":"11.5564","home_longitude":"104.9282"}'::jsonb,
      '{"relationship":"mother","full_name_en":"Test Dara","phone":"+855123456789"}'::jsonb,
      '{"relationship":"Neighbour","full_name_en":"Test Neighbour","phone":"011222333"}'::jsonb, %L::uuid)$q$, cls), 'ok');
  perform t.try('directory view returns the joined row for staff A', a,
    $q$select * from public.student_directory where student_id='TEST-0001' and class_name_en='Grade 7A' and guardian_count=1 and emergency_contact_count=1 and has_location$q$, 'ok', 1);
  perform t.try('RPC is atomic: bad guardian phone fails', a,
    $q$select public.register_student('{"student_id":"TEST-0002","full_name":"Test Atomic"}'::jsonb, '{"relationship":"father","full_name_en":"X","phone":"12"}'::jsonb)$q$, '23514');
  perform t.is_true('...and left no student behind', $q$select not exists (select 1 from public.students where student_id='TEST-0002')$q$);
  perform t.try('constraint: unknown status rejected', a, $q$update public.students set enrollment_status='bogus' where student_id='TEST-0001'$q$, '23514');
  perform t.try('constraint: future birth date rejected', a, $q$update public.students set date_of_birth = current_date + 2 where student_id='TEST-0001'$q$, '23514');
  perform t.try('column grant: student_id immutable', a, $q$update public.students set student_id='X' where student_id='TEST-0001'$q$, '42501');
  perform t.try('no delete on students', a, 'delete from public.students', '42501');
  perform t.try('inactive staff B reads zero students', b, 'select * from public.students', 'ok', 0);
  perform t.try('inactive staff B reads zero directory rows', b, 'select * from public.student_directory', 'ok', 0);
  perform t.try('inactive staff B cannot register', b, $q$select public.register_student('{"student_id":"T-B","full_name":"x"}'::jsonb)$q$, '42501');
  perform t.try('staff A saves own language preference', a, format($q$insert into public.staff_preferences (user_id, language) values (%L,'km')$q$, a), 'ok', 1);
  perform t.try('staff A cannot save one for B', a, format($q$insert into public.staff_preferences (user_id, language) values (%L,'km')$q$, b), '42501');
  perform t.is_true('audit recorded student, guardian, contact and enrollment inserts by A',
    $q$select count(distinct entity) = 4 and bool_and(actor_id = '00000000-0000-4000-8000-0000000000a1') from public.student_record_audit where student_id='TEST-0001'$q$);
  perform t.is_true('anon holds no privilege on any Phase 2 object',
    $q$select not exists (select 1 from unnest(array['classes','student_enrollments','student_guardians','student_emergency_contacts','staff_preferences','student_directory','students','student_record_audit']) r where has_table_privilege('anon','public.'||r,'SELECT,INSERT,UPDATE,DELETE'))$q$);
  perform t.is_true('anon cannot execute any public function',
    $q$select not exists (select 1 from pg_proc p where p.pronamespace='public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE'))$q$);
  perform t.is_true('authenticated can execute only the helpers and the 3 RPCs',
    $q$select (select array_agg(p.proname order by p.proname) from pg_proc p where p.pronamespace='public'::regnamespace and has_function_privilege('authenticated', p.oid, 'EXECUTE')) = array['assign_student_class','end_student_enrollment','has_staff_role','is_active_staff','register_student']::name[]$q$);
  perform t.is_true('student_directory is security_invoker', $q$select 'security_invoker=true' = any (reloptions) from pg_class where oid='public.student_directory'::regclass$q$);
  perform t.is_true('student-photos bucket exists, private, 1 MB, image types only',
    $q$select not public and file_size_limit = 1048576 and allowed_mime_types @> array['image/jpeg','image/png','image/webp'] from storage.buckets where id='student-photos'$q$);
  perform t.is_true('four student-photos storage policies exist', $q$select count(*) = 4 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'student_photos_%'$q$);
  perform t.try('staff A can add a photo object', a, $q$insert into storage.objects (bucket_id, name) values ('student-photos','test-a.jpg')$q$, 'ok', 1);
  perform t.try('staff A cannot add to another bucket', a, $q$insert into storage.objects (bucket_id, name) values ('avatars','test-a.jpg')$q$, '42501');
  perform t.try('inactive B cannot add a photo object', b, $q$insert into storage.objects (bucket_id, name) values ('student-photos','test-b.jpg')$q$, '42501');
  perform t.try('anon cannot add a photo object', null, $q$insert into storage.objects (bucket_id, name) values ('student-photos','test-anon.jpg')$q$, '42501');
  perform t.try('inactive B sees zero photo objects', b, $q$select * from storage.objects where bucket_id='student-photos'$q$, 'ok', 0);
end
$$;
do $$
declare report text;
begin
  select string_agg(case when ok then 'PASS ' else 'FAIL ' end || label || ' | ' || detail, E'\n' order by n)
    || E'\nSUMMARY pass=' || count(*) filter (where ok) || ' fail=' || count(*) filter (where not ok) || ' total=' || count(*)
  into report from t.results;
  raise exception E'PHASE2_LIVE_SMOKE_REPORT\n%', report;
end
$$;
