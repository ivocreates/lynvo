-- Allow trusted server contexts to administer profiles.
--
-- enforce_profile_privileges() previously required an authenticated super admin,
-- so service-role calls and SQL-editor bootstrap (where auth.uid() is null) were
-- rejected. RLS already denies anonymous clients any UPDATE path on profiles, so
-- deferring to it when there is no authenticated user is safe.

create or replace function public.enforce_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_trusted_server boolean;
begin
  is_trusted_server := auth.uid() is null or coalesce(auth.role(), '') = 'service_role';

  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not is_trusted_server
     and not public.is_super_admin() then
    raise exception 'Only a super admin can change role or is_active';
  end if;

  new.id := old.id;
  new.email := old.email;
  new.updated_at := now();

  return new;
end;
$$;
