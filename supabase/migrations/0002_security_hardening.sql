-- LYNVO security hardening
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

-- ---------------------------------------------------------------------------
-- 1. Close the profile privilege-escalation hole
--
-- The original "profiles_update_own" policy let any authenticated user update
-- their own row, including role and is_active — a self-service path to
-- super_admin. Column-level protection is enforced with a trigger because RLS
-- WITH CHECK cannot compare against the pre-update row.
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
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
      and role = 'super_admin'
  );
$$;

create or replace function public.enforce_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.is_super_admin() then
    raise exception 'Only a super admin can change role or is_active';
  end if;

  -- Identity columns are owned by auth.users, never by the client.
  new.id := old.id;
  new.email := old.email;
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists profiles_enforce_privileges on profiles;
create trigger profiles_enforce_privileges
  before update on profiles
  for each row execute procedure public.enforce_profile_privileges();

-- A super admin must not be able to lock themselves out or self-demote silently.
create or replace function public.prevent_last_super_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'super_admin'
     and (new.role is distinct from 'super_admin' or new.is_active = false)
     and (select count(*) from profiles where role = 'super_admin' and is_active = true) <= 1 then
    raise exception 'Cannot remove the last active super admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_last_super_admin on profiles;
create trigger profiles_protect_last_super_admin
  before update on profiles
  for each row execute procedure public.prevent_last_super_admin_removal();

-- ---------------------------------------------------------------------------
-- 2. Tighten anonymous write surface
-- ---------------------------------------------------------------------------

-- Contacts: the public form may only create a brand-new enquiry, never
-- backdate it or insert it in an already-handled state.
drop policy if exists "contacts_insert_public" on contacts;
create policy "contacts_insert_public" on contacts
  for insert
  with check (
    status = 'new'
    and length(name) between 2 and 120
    and length(message) between 10 and 4000
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- Nobody may delete or update an enquiry except staff.
drop policy if exists "contacts_staff_delete" on contacts;
create policy "contacts_staff_delete" on contacts
  for delete using (is_admin());

drop policy if exists "newsletter_insert_public" on newsletter_subscribers;
create policy "newsletter_insert_public" on newsletter_subscribers
  for insert
  with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 320);

-- ---------------------------------------------------------------------------
-- 3. Restrict destructive content operations to admins
--    (editors keep create/update, but cannot delete published records)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'services', 'projects', 'blog_posts', 'team_members',
    'reviews', 'stats', 'social_links', 'media_assets'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_admin_delete', t);
    execute format(
      'create policy %I on %I for delete using (is_admin())',
      t || '_admin_delete', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Lock down function and schema privileges
-- ---------------------------------------------------------------------------

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- Audit logs are append-only history; they must never be edited or removed.
drop policy if exists "audit_logs_no_update" on audit_logs;
create policy "audit_logs_no_update" on audit_logs for update using (false) with check (false);

drop policy if exists "audit_logs_no_delete" on audit_logs;
create policy "audit_logs_no_delete" on audit_logs for delete using (false);

-- Prevent future tables from being world-accessible by default.
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------------
-- 5. Storage policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('private-uploads', 'private-uploads', false)
on conflict (id) do nothing;

drop policy if exists "public_media_read" on storage.objects;
create policy "public_media_read" on storage.objects
  for select using (bucket_id = 'public-media');

drop policy if exists "public_media_staff_write" on storage.objects;
create policy "public_media_staff_write" on storage.objects
  for insert with check (bucket_id = 'public-media' and is_staff());

drop policy if exists "public_media_staff_update" on storage.objects;
create policy "public_media_staff_update" on storage.objects
  for update using (bucket_id = 'public-media' and is_staff());

drop policy if exists "public_media_admin_delete" on storage.objects;
create policy "public_media_admin_delete" on storage.objects
  for delete using (bucket_id = 'public-media' and is_admin());

drop policy if exists "private_uploads_staff_all" on storage.objects;
create policy "private_uploads_staff_all" on storage.objects
  for all using (bucket_id = 'private-uploads' and is_staff())
  with check (bucket_id = 'private-uploads' and is_staff());
