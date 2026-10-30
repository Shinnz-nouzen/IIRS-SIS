insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-0000000000a1','staff-a@example.invalid'),
 ('00000000-0000-4000-8000-0000000000b2','staff-b@example.invalid');
insert into public.staff_profiles (user_id, role, is_active) values
 ('00000000-0000-4000-8000-0000000000a1','office_staff', true),
 ('00000000-0000-4000-8000-0000000000b2','office_staff', false);
