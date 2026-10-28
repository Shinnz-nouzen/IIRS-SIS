create type public.staff_role as enum (
  'administrator',
  'office_staff'
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;

revoke all on table public.staff_profiles from public, anon, authenticated;
grant select on table public.staff_profiles to authenticated;
grant usage on type public.staff_role to authenticated;

create policy staff_profiles_select_own
on public.staff_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
  );
$$;

alter function public.is_active_staff() owner to postgres;
revoke all on function public.is_active_staff() from public, anon, authenticated;
grant execute on function public.is_active_staff() to authenticated;

create function public.has_staff_role(required_role public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.is_active
      and profile.role = required_role
  );
$$;

alter function public.has_staff_role(public.staff_role) owner to postgres;
revoke all on function public.has_staff_role(public.staff_role)
  from public, anon, authenticated;
grant execute on function public.has_staff_role(public.staff_role)
  to authenticated;
