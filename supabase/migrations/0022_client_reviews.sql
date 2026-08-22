-- Allow authenticated client portal users to submit reviews for moderation.

alter table reviews add column if not exists client_id uuid references clients (id) on delete set null;
create index if not exists reviews_client_idx on reviews (client_id, created_at desc);

create or replace function public.enforce_client_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
  client_contact text;
begin
  select name, contact_name into client_name, client_contact
  from clients
  where id = public.my_client_id();

  if client_name is null then
    raise exception 'A linked client account is required';
  end if;

  new.client_id := public.my_client_id();
  new.author_name := coalesce(nullif(trim(client_contact), ''), client_name);
  new.author_role := 'Client';
  new.status := 'pending';
  new.featured := false;
  return new;
end;
$$;

drop trigger if exists reviews_client_insert on reviews;
create trigger reviews_client_insert
  before insert on reviews
  for each row execute procedure public.enforce_client_review_insert();

drop policy if exists "reviews_client_insert" on reviews;
create policy "reviews_client_insert" on reviews
  for insert with check (client_id = public.my_client_id() and status = 'pending' and featured = false);

grant insert on reviews to authenticated;