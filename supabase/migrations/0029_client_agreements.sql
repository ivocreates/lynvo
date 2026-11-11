-- LYNVO platform, phase 10: client agreements generated from legal templates
-- (portfolio consent, IP assignment, handover certificate, licences, NDAs,
-- service / maintenance agreements, change requests, VAPT authorisation).
--
-- Staff documents (offer letters, payslips, certificates...) keep using
-- staff_documents; the new HR doc types were added in 0027.

create table if not exists client_agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  engagement_id uuid references client_engagements (id) on delete set null,
  template_key text,
  title text not null,
  reference text,
  -- Same light markup as staff_documents; see lib/documents.ts.
  body text not null default '',
  field_values jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  signature_required boolean not null default true,
  issue_date date not null default current_date,
  sent_at timestamptz,
  signer_name text,
  signer_designation text,
  signed_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_agreements_status_check check (status in ('draft', 'sent', 'signed', 'void'))
);

create index if not exists client_agreements_client_idx on client_agreements (client_id, status);
create unique index if not exists client_agreements_reference_idx on client_agreements (lower(reference))
  where reference is not null;

-- A signed agreement is frozen: only its status may move to void.
create or replace function public.enforce_client_agreement_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'signed' and coalesce(current_setting('lynvo.agreement_sign', true), '') <> 'on' then
    new.body := old.body;
    new.title := old.title;
    new.field_values := old.field_values;
    new.signer_name := old.signer_name;
    new.signer_designation := old.signer_designation;
    new.signed_at := old.signed_at;
    if new.status not in ('signed', 'void') then
      new.status := old.status;
    end if;
  end if;

  if new.status = 'sent' and old.status is distinct from 'sent' and new.sent_at is null then
    new.sent_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists client_agreements_enforce_update on client_agreements;
create trigger client_agreements_enforce_update
  before update on client_agreements
  for each row execute procedure public.enforce_client_agreement_update();

-- The client's e-signature: typed name, designation and a server timestamp.
create or replace function public.client_sign_agreement(agreement uuid, signer text, designation text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := public.my_client_id();
  changed int;
begin
  if me is null then
    raise exception 'Only a client can sign';
  end if;
  if length(trim(coalesce(signer, ''))) < 2 then
    raise exception 'A name is required';
  end if;

  perform set_config('lynvo.agreement_sign', 'on', true);

  update client_agreements
     set status = 'signed',
         signer_name = trim(signer),
         signer_designation = nullif(trim(designation), ''),
         signed_at = now()
   where id = agreement
     and client_id = me
     and status = 'sent';
  -- Read the row count before PERFORM, which would overwrite FOUND.
  get diagnostics changed = row_count;

  perform set_config('lynvo.agreement_sign', 'off', true);
  return changed > 0;
end;
$$;

revoke all on function public.client_sign_agreement(uuid, text, text) from public;
grant execute on function public.client_sign_agreement(uuid, text, text) to authenticated;

alter table client_agreements enable row level security;

drop policy if exists "client_agreements_manage" on client_agreements;
create policy "client_agreements_manage" on client_agreements
  for all using (has_permission('clients.manage')) with check (has_permission('clients.manage'));

drop policy if exists "client_agreements_client_read" on client_agreements;
create policy "client_agreements_client_read" on client_agreements
  for select using (client_id = my_client_id() and status in ('sent', 'signed'));

grant select, insert, update, delete on client_agreements to authenticated;

insert into site_settings (key, value) values
  ('legal_jurisdiction', jsonb_build_object('text', '')),
  ('legal_reference_prefix', jsonb_build_object('text', 'LYNVO/LGL'))
on conflict (key) do nothing;
