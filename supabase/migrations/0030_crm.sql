-- LYNVO platform, phase 11: marketing & sales CRM.
--
-- Leads move through a pipeline; every call, email, WhatsApp, meeting and
-- research note is logged as an activity. Access follows the `crm` permission.

create table if not exists crm_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  designation text,
  email text,
  phone text,
  website text,
  social_url text,
  industry text,
  city text,
  country text not null default 'India',
  -- Which brand the lead is for: lynvo.studio (online presence) or lynvo.tech (software / security).
  site text not null default 'studio',
  source text not null default 'cold_call',
  status text not null default 'new',
  priority text not null default 'medium',
  interests text[] not null default '{}',
  estimated_value numeric(14, 2),
  currency text not null default 'INR',
  owner_id uuid references profiles (id) on delete set null,
  next_follow_up date,
  last_contacted_at timestamptz,
  lost_reason text,
  notes text,
  research_notes text,
  client_id uuid references clients (id) on delete set null,
  contact_id uuid references contacts (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_leads_status_check
    check (status in ('new', 'researching', 'contacted', 'follow_up', 'meeting', 'proposal', 'won', 'lost')),
  constraint crm_leads_priority_check check (priority in ('low', 'medium', 'high')),
  constraint crm_leads_site_check check (site in ('studio', 'tech')),
  constraint crm_leads_source_check
    check (source in ('cold_call', 'referral', 'website', 'instagram', 'linkedin', 'google_maps', 'whatsapp', 'walk_in', 'event', 'email', 'other'))
);

create index if not exists crm_leads_status_idx on crm_leads (status, next_follow_up);
create index if not exists crm_leads_owner_idx on crm_leads (owner_id, status);
create index if not exists crm_leads_follow_up_idx on crm_leads (next_follow_up) where status not in ('won', 'lost');
create index if not exists crm_leads_phone_idx on crm_leads (phone);

create table if not exists crm_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references crm_leads (id) on delete cascade,
  kind text not null default 'call',
  outcome text,
  summary text,
  occurred_at timestamptz not null default now(),
  duration_minutes int,
  follow_up_on date,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint crm_activities_kind_check
    check (kind in ('call', 'email', 'whatsapp', 'meeting', 'visit', 'note', 'research', 'status')),
  constraint crm_activities_outcome_check
    check (outcome is null or outcome in ('no_answer', 'busy', 'callback', 'interested', 'not_interested', 'meeting_booked', 'proposal_requested', 'wrong_number', 'sent', 'replied', 'other'))
);

create index if not exists crm_activities_lead_idx on crm_activities (lead_id, occurred_at desc);
create index if not exists crm_activities_author_idx on crm_activities (created_by, occurred_at desc);

-- Logging an activity keeps the lead's follow-up date and stage current.
create or replace function public.crm_activity_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update crm_leads l
     set last_contacted_at = case
           when new.kind in ('call', 'email', 'whatsapp', 'meeting', 'visit') then greatest(coalesce(l.last_contacted_at, new.occurred_at), new.occurred_at)
           else l.last_contacted_at
         end,
         next_follow_up = coalesce(new.follow_up_on, case when new.kind in ('call', 'email', 'whatsapp', 'meeting', 'visit') and l.next_follow_up <= current_date then null else l.next_follow_up end),
         status = case
           when l.status in ('won', 'lost') then l.status
           when new.outcome = 'meeting_booked' then 'meeting'
           when new.outcome = 'proposal_requested' then 'proposal'
           when new.outcome = 'callback' or new.follow_up_on is not null then
             case when l.status in ('new', 'researching', 'contacted') then 'follow_up' else l.status end
           when new.kind in ('call', 'email', 'whatsapp', 'meeting', 'visit') and l.status in ('new', 'researching') then 'contacted'
           when new.kind = 'research' and l.status = 'new' then 'researching'
           else l.status
         end,
         updated_at = now()
   where l.id = new.lead_id;
  return null;
end;
$$;

drop trigger if exists crm_activities_logged on crm_activities;
create trigger crm_activities_logged
  after insert on crm_activities
  for each row execute procedure public.crm_activity_logged();

alter table crm_leads enable row level security;
alter table crm_activities enable row level security;

drop policy if exists "crm_leads_manage" on crm_leads;
create policy "crm_leads_manage" on crm_leads
  for all using (has_permission('crm')) with check (has_permission('crm'));

drop policy if exists "crm_activities_manage" on crm_activities;
create policy "crm_activities_manage" on crm_activities
  for all using (has_permission('crm')) with check (has_permission('crm'));

-- Converting a lead creates a client account.
drop policy if exists "clients_crm_insert" on clients;
create policy "clients_crm_insert" on clients
  for insert with check (has_permission('crm'));
drop policy if exists "clients_crm_read" on clients;
create policy "clients_crm_read" on clients
  for select using (has_permission('crm'));

-- Website enquiries are part of the sales inbox.
drop policy if exists "contacts_crm_read" on contacts;
create policy "contacts_crm_read" on contacts for select using (has_permission('crm'));
drop policy if exists "contacts_crm_update" on contacts;
create policy "contacts_crm_update" on contacts for update using (has_permission('crm')) with check (has_permission('crm'));

grant select, insert, update, delete on crm_leads to authenticated;
grant select, insert, update, delete on crm_activities to authenticated;

insert into site_settings (key, value) values
  ('crm_daily_call_target', jsonb_build_object('text', '25')),
  ('crm_weekly_meeting_target', jsonb_build_object('text', '3')),
  ('crm_monthly_won_target', jsonb_build_object('text', '4'))
on conflict (key) do nothing;
