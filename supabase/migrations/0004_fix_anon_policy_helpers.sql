-- Restore anonymous execute on the RLS helper functions.
--
-- 0002 revoked EXECUTE from anon. Postgres still evaluates the permissive
-- "FOR ALL" staff policies when an anonymous client runs a SELECT, so every
-- public read failed with: permission denied for function is_staff.
--
-- Granting EXECUTE back is safe: the helpers are security definer and simply
-- return false when there is no authenticated user. They expose no data.

grant execute on function public.is_admin() to anon;
grant execute on function public.is_staff() to anon;
grant execute on function public.is_super_admin() to anon;
