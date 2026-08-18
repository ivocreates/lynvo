-- LYNVO client portal: engagements, timeline, deliverables, and reports.
--
-- A client user is a profile with role 'client' linked to a clients row. They
-- see only their own engagement and only the parts staff have marked visible.

create type engagement_status as enum ('discovery', 'in_progress', 'review', 'delivered', 'on_hold', 'cancelled');
create type milestone_status as enum ('planned', 'in_progress', 'done', 'blocked');
create type deliverable_kind as enum ('preview', 'file', 'link', 'report');
create type deliverable_status as enum ('pending', 'in_review', 'approved', 'revision_requested', 'delivered');
create type client_status as enum ('active', 'paused', 'archived');

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  logo_url text,
  status client_status not null default 'active',
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists client_id uuid references clients (id) on delete set null;
create index if not exists profiles_client_idx on profiles (client_id);

-- ---------------------------------------------------------------------------
-- Engagements
-- ---------------------------------------------------------------------------

create table client_engagements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  title text not null,
  summary text,
  status engagement_status not null default 'discovery',
  progress int not null default 0 check (progress between 0 and 100),
  start_date date,
  target_date date,
  delivered_at timestamptz,
  -- Optional link to the public portfolio entry once the work ships.
  project_id uuid references projects (id) on delete set null,
  lead_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_engagements_client_idx on client_engagements (client_id, status);

create table client_milestones (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references client_engagements (id) on delete cascade,
  title text not null,
  description text,
  status milestone_status not null default 'planned',
  due_date date,
  completed_at timestamptz,
  position int not null default 0,
  -- Internal steps can be hidden from the client's timeline.
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_milestones_engagement_idx on client_milestones (engagement_id, position);

create table client_deliverables (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references client_engagements (id) on delete cascade,
  title text not null,
  description text,
  kind deliverable_kind not null default 'preview',
  url text,
  version text,
  status deliverable_status not null default 'pending',
  due_date date,
  delivered_at timestamptz,
  client_feedback text,
  reviewed_at timestamptz,
  visible_to_client boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_deliverables_engagement_idx on client_deliverables (engagement_id, position);

create table client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  engagement_id uuid references client_engagements (id) on delete set null,
  title text not null,
  period_start date,
  period_end date,
  -- Same light markup as staff_documents; see lib/documents.ts.
  body text not null default '',
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_reports_client_idx on client_reports (client_id, published);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Clients are NOT team members. Without this they would inherit read access to
-- staff notes, tasks, goals, meetings, and the internal directory.
create or replace function public.is_team_member()
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
      and role <> 'client'
  );
$$;

create or replace function public.my_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select client_id from profiles
  where id = auth.uid() and is_active = true and role = 'client';
$$;

revoke all on function public.my_client_id() from public;
grant execute on function public.my_client_id() to anon, authenticated;

-- A client may record their verdict on a deliverable and nothing else.
create or replace function public.enforce_deliverable_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    new.engagement_id := old.engagement_id;
    new.title := old.title;
    new.description := old.description;
    new.kind := old.kind;
    new.url := old.url;
    new.version := old.version;
    new.due_date := old.due_date;
    new.delivered_at := old.delivered_at;
    new.visible_to_client := old.visible_to_client;
    new.position := old.position;

    if new.status not in ('approved', 'revision_requested') then
      raise exception 'A client may only approve or request changes';
    end if;

    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger client_deliverables_enforce_update
  before update on client_deliverables
  for each row execute procedure public.enforce_deliverable_update();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table clients enable row level security;
alter table client_engagements enable row level security;
alter table client_milestones enable row level security;
alter table client_deliverables enable row level security;
alter table client_reports enable row level security;

create policy "clients_staff_manage" on clients
  for all using (is_staff()) with check (is_staff());
create policy "clients_own_read" on clients
  for select using (id = my_client_id());

create policy "client_engagements_staff_manage" on client_engagements
  for all using (is_staff()) with check (is_staff());
create policy "client_engagements_own_read" on client_engagements
  for select using (client_id = my_client_id());

create policy "client_milestones_staff_manage" on client_milestones
  for all using (is_staff()) with check (is_staff());
create policy "client_milestones_own_read" on client_milestones
  for select using (
    visible_to_client
    and exists (
      select 1 from client_engagements e
      where e.id = engagement_id and e.client_id = my_client_id()
    )
  );

create policy "client_deliverables_staff_manage" on client_deliverables
  for all using (is_staff()) with check (is_staff());
create policy "client_deliverables_own_read" on client_deliverables
  for select using (
    visible_to_client
    and exists (
      select 1 from client_engagements e
      where e.id = engagement_id and e.client_id = my_client_id()
    )
  );
create policy "client_deliverables_own_review" on client_deliverables
  for update using (
    visible_to_client
    and exists (
      select 1 from client_engagements e
      where e.id = engagement_id and e.client_id = my_client_id()
    )
  )
  with check (
    exists (
      select 1 from client_engagements e
      where e.id = engagement_id and e.client_id = my_client_id()
    )
  );

create policy "client_reports_staff_manage" on client_reports
  for all using (is_staff()) with check (is_staff());
create policy "client_reports_own_read" on client_reports
  for select using (published and client_id = my_client_id());

grant select, insert, update, delete on clients to authenticated;
grant select, insert, update, delete on client_engagements to authenticated;
grant select, insert, update, delete on client_milestones to authenticated;
grant select, insert, update, delete on client_deliverables to authenticated;
grant select, insert, update, delete on client_reports to authenticated;
