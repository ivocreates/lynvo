-- LYNVO team platform, phase 4: letterhead documents.
--
-- One table covers contracts, offer letters, NDAs, policies, and general
-- letters. Individual documents belong to one recipient; policy-style documents
-- are addressed to a group.

create type staff_doc_type as enum ('contract', 'offer_letter', 'nda', 'policy', 'letter');
create type staff_doc_status as enum ('draft', 'issued', 'archived');
create type staff_doc_audience as enum ('individual', 'team', 'employees', 'interns');

-- ---------------------------------------------------------------------------
-- Role lookup used by the audience policies
-- ---------------------------------------------------------------------------

create or replace function public.my_role()
returns app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid() and is_active = true;
$$;

revoke all on function public.my_role() from public;
grant execute on function public.my_role() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

create table staff_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type staff_doc_type not null default 'contract',
  status staff_doc_status not null default 'draft',
  audience staff_doc_audience not null default 'individual',
  title text not null,
  -- Human-facing document number, e.g. LYNVO/HR/2026/001.
  reference text,
  -- Plain text with light markup; see lib/documents.ts for the renderer.
  body text not null default '',
  recipient_id uuid references profiles (id) on delete cascade,
  issue_date date not null default current_date,
  effective_from date,
  effective_to date,
  acknowledged_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_documents_recipient_idx on staff_documents (recipient_id, status);
create unique index staff_documents_reference_idx on staff_documents (lower(reference))
  where reference is not null;

-- A recipient may acknowledge their document and nothing else.
create or replace function public.enforce_document_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_manager() then
    new.doc_type := old.doc_type;
    new.status := old.status;
    new.audience := old.audience;
    new.title := old.title;
    new.reference := old.reference;
    new.body := old.body;
    new.recipient_id := old.recipient_id;
    new.issue_date := old.issue_date;
    new.effective_from := old.effective_from;
    new.effective_to := old.effective_to;
    new.created_by := old.created_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger staff_documents_enforce_update
  before update on staff_documents
  for each row execute procedure public.enforce_document_update();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table staff_documents enable row level security;

-- Drafts stay with managers; issued documents reach their audience.
create policy "staff_documents_read" on staff_documents
  for select using (
    is_manager()
    or (
      status = 'issued'
      and (
        recipient_id = auth.uid()
        or (audience = 'team' and is_team_member())
        or (audience = 'employees' and my_role() in ('employee', 'editor', 'junior_partner'))
        or (audience = 'interns' and my_role() = 'intern')
      )
    )
  );

create policy "staff_documents_manager_write" on staff_documents
  for all using (is_manager()) with check (is_manager());

create policy "staff_documents_acknowledge" on staff_documents
  for update using (recipient_id = auth.uid() and status = 'issued')
  with check (recipient_id = auth.uid());

grant select, insert, update, delete on staff_documents to authenticated;

-- ---------------------------------------------------------------------------
-- Letterhead defaults reused from the billing settings, plus HR extras
-- ---------------------------------------------------------------------------

insert into site_settings (key, value) values
  ('doc_reference_prefix', jsonb_build_object('text', 'LYNVO/HR')),
  ('doc_signatory_name', jsonb_build_object('text', 'Ivo Pereira')),
  ('doc_signatory_title', jsonb_build_object('text', 'Founder & CEO')),
  ('doc_footer_note', jsonb_build_object('text', 'This document is issued by LYNVO and is confidential to the named recipient.'))
on conflict (key) do nothing;
