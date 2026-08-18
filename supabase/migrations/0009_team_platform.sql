-- LYNVO team platform, phase 2: role hierarchy, staff profile fields, and the
-- access helpers the /staff dashboard is built on.
--
-- Role ladder (low to high):
--   intern < employee < editor < junior_partner < admin < senior_partner < super_admin
--
-- Access tiers:
--   is_team_member()  any active profile, including interns  -> /staff
--   is_staff()        editor and above                       -> /admin (CMS)
--   is_manager()      junior_partner and above               -> assign work, manage people
--   is_admin()        admin, senior_partner, super_admin     -> settings, contacts, billing

-- ---------------------------------------------------------------------------
-- 1. Staff profile fields
-- ---------------------------------------------------------------------------

alter table profiles add column if not exists title text;
alter table profiles add column if not exists department text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists skills text[] default '{}';
-- 'full-time' | 'part-time' | 'internship' | 'freelance' | 'partner'
alter table profiles add column if not exists employment_type text;
alter table profiles add column if not exists joined_on date;
-- Contract or internship end date; drives certificate eligibility later.
alter table profiles add column if not exists ends_on date;
alter table profiles add column if not exists manager_id uuid references profiles (id) on delete set null;

create index if not exists profiles_manager_idx on profiles (manager_id);
create index if not exists profiles_role_idx on profiles (role) where is_active = true;

-- ---------------------------------------------------------------------------
-- 2. Access helpers
-- ---------------------------------------------------------------------------

-- Any active person on the team, interns included.
create or replace function public.is_team_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- CMS access. Deliberately excludes employees and interns, who previously would
-- have inherited full content write access from the old "any active profile"
-- definition of is_staff().
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active = true
      and role in ('editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
  );
$$;

-- Can assign work and manage people.
create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active = true
      and role in ('junior_partner', 'admin', 'senior_partner', 'super_admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'senior_partner', 'super_admin')
  );
$$;

revoke all on function public.is_team_member() from public;
revoke all on function public.is_manager() from public;
-- 0004: the permissive staff policies are evaluated even for anonymous reads,
-- so anon needs EXECUTE or every public select fails.
grant execute on function public.is_team_member() to anon, authenticated;
grant execute on function public.is_manager() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Profile visibility
-- ---------------------------------------------------------------------------

-- Team members can see each other (needed for task assignment and directory).
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id or is_team_member());

-- Managers may edit staff records, but role and is_active remain guarded by
-- enforce_profile_privileges(), which still requires a super admin.
drop policy if exists "profiles_manager_manage" on profiles;
create policy "profiles_manager_manage" on profiles
  for update using (is_manager()) with check (is_manager());
