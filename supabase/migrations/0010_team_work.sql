-- LYNVO team platform, phase 3: assigned work, notes, goals, and meetings.
--
-- Task lifecycle: todo -> working -> completed (by the assignee) -> approved
-- (by a manager). A manager can also send work back with a review note, which
-- drops it to 'working'.

create type task_status as enum ('todo', 'working', 'completed', 'approved', 'blocked');
create type task_priority as enum ('low', 'normal', 'high', 'urgent');
create type goal_status as enum ('active', 'achieved', 'missed', 'paused');
create type note_visibility as enum ('private', 'team', 'managers');

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'normal',
  assignee_id uuid references profiles (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  project_id uuid references projects (id) on delete set null,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_tasks_assignee_idx on staff_tasks (assignee_id, status, due_date);
create index staff_tasks_status_idx on staff_tasks (status, created_at desc);

-- Assignees may move their own task through the workflow, but everything else —
-- who it belongs to, and the approval itself — stays with managers.
create or replace function public.enforce_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_manager() then
    new.title := old.title;
    new.description := old.description;
    new.priority := old.priority;
    new.assignee_id := old.assignee_id;
    new.created_by := old.created_by;
    new.project_id := old.project_id;
    new.due_date := old.due_date;
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
    new.review_note := old.review_note;

    if new.status = 'approved' and old.status is distinct from 'approved' then
      raise exception 'Only a manager can approve a task';
    end if;
  end if;

  if new.status = 'working' and old.status is distinct from 'working' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger staff_tasks_enforce_update
  before update on staff_tasks
  for each row execute procedure public.enforce_task_update();

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------

create table staff_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text,
  visibility note_visibility not null default 'private',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_notes_author_idx on staff_notes (author_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------

create table staff_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  -- Null owner means a company-wide goal.
  owner_id uuid references profiles (id) on delete cascade,
  metric text,
  target_value numeric(14, 2),
  current_value numeric(14, 2) not null default 0,
  due_date date,
  status goal_status not null default 'active',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_goals_owner_idx on staff_goals (owner_id, status);

-- ---------------------------------------------------------------------------
-- Meetings
-- ---------------------------------------------------------------------------

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agenda text,
  -- 'weekly' | 'fortnightly' | 'once'
  cadence text not null default 'weekly',
  -- 0 = Sunday .. 6 = Saturday, used by the recurring cadences.
  weekday smallint check (weekday between 0 and 6),
  start_time time not null default '10:00',
  duration_minutes int not null default 30,
  -- One-off meetings use this instead of weekday.
  starts_on date,
  location text,
  -- 'all' | 'managers'
  audience text not null default 'all',
  is_active boolean not null default true,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table staff_tasks enable row level security;
alter table staff_notes enable row level security;
alter table staff_goals enable row level security;
alter table meetings enable row level security;

-- Tasks: you see your own work; managers see everything.
create policy "staff_tasks_read" on staff_tasks
  for select using (is_manager() or assignee_id = auth.uid() or created_by = auth.uid());
create policy "staff_tasks_manager_insert" on staff_tasks
  for insert with check (is_manager());
create policy "staff_tasks_update" on staff_tasks
  for update using (is_manager() or assignee_id = auth.uid())
  with check (is_manager() or assignee_id = auth.uid());
create policy "staff_tasks_manager_delete" on staff_tasks
  for delete using (is_manager());

-- Notes: private to the author unless shared with the team or with managers.
create policy "staff_notes_read" on staff_notes
  for select using (
    author_id = auth.uid()
    or (visibility = 'team' and is_team_member())
    or (visibility = 'managers' and is_manager())
  );
create policy "staff_notes_insert" on staff_notes
  for insert with check (is_team_member() and author_id = auth.uid());
create policy "staff_notes_update" on staff_notes
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "staff_notes_delete" on staff_notes
  for delete using (author_id = auth.uid() or is_manager());

-- Goals: visible to the whole team; owners update their own progress.
create policy "staff_goals_read" on staff_goals
  for select using (is_team_member());
create policy "staff_goals_manager_write" on staff_goals
  for all using (is_manager()) with check (is_manager());
create policy "staff_goals_owner_update" on staff_goals
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Meetings: everyone reads, managers manage.
create policy "meetings_read" on meetings
  for select using (is_team_member());
create policy "meetings_manager_write" on meetings
  for all using (is_manager()) with check (is_manager());

grant select, insert, update, delete on staff_tasks to authenticated;
grant select, insert, update, delete on staff_notes to authenticated;
grant select, insert, update, delete on staff_goals to authenticated;
grant select, insert, update, delete on meetings to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: the weekly team meeting
-- ---------------------------------------------------------------------------

insert into meetings (title, agenda, cadence, weekday, start_time, duration_minutes, location, audience)
values (
  'Weekly team sync',
  E'1. Wins since last week\n2. Blockers\n3. This week''s priorities\n4. Review queue',
  'weekly',
  1,
  '10:00',
  45,
  'Google Meet',
  'all'
)
on conflict do nothing;
