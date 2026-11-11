-- LYNVO platform, phase 9:
--   1. Admin-controlled module permissions (per role and per person)
--   2. Quote -> invoice workflow with advance / milestone / balance invoices
--   3. Payments ledger that keeps invoice balances and status in sync
--   4. Client accounts for every billed client, plus recurring subscriptions
--   5. Graphic design, stationery and brand identity catalogue

-- ===========================================================================
-- 1. Permissions
-- ===========================================================================
--
-- Admins, senior partners and super admins implicitly hold every permission.
-- Everyone else receives permissions from their role, and an admin may grant
-- or revoke a permission for one person on top of that.
--
--   billing.manage   create, send and edit quotes/invoices, record payments
--   billing.draft    draft quotes for review (staff workspace)
--   clients.manage   client accounts, engagements, deliverables, reports, legal docs
--   crm              marketing pipeline: leads, calls, research, follow-ups
--   website          public website content on lynvo.studio and lynvo.tech

create table if not exists role_permissions (
  role app_role not null,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (role, permission)
);

create table if not exists staff_permissions (
  user_id uuid not null references profiles (id) on delete cascade,
  permission text not null,
  -- false records an explicit revoke of something the role would grant.
  allowed boolean not null default true,
  granted_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create or replace function public.has_permission(perm text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select
        case
          when p.role in ('admin', 'senior_partner', 'super_admin') then true
          when sp.allowed is not null then sp.allowed
          else exists (select 1 from role_permissions rp where rp.role = p.role and rp.permission = perm)
        end
      from profiles p
      left join staff_permissions sp on sp.user_id = p.id and sp.permission = perm
      where p.id = auth.uid() and p.is_active = true and p.role <> 'client'
    ),
    false
  );
$$;

revoke all on function public.has_permission(text) from public;
-- Policies are evaluated for anonymous reads too (see 0004), so anon needs EXECUTE.
grant execute on function public.has_permission(text) to anon, authenticated;

alter table role_permissions enable row level security;
alter table staff_permissions enable row level security;

drop policy if exists "role_permissions_team_read" on role_permissions;
create policy "role_permissions_team_read" on role_permissions
  for select using (is_team_member());
drop policy if exists "role_permissions_admin_write" on role_permissions;
create policy "role_permissions_admin_write" on role_permissions
  for all using (is_admin()) with check (is_admin());

drop policy if exists "staff_permissions_read" on staff_permissions;
create policy "staff_permissions_read" on staff_permissions
  for select using (user_id = auth.uid() or is_manager());
drop policy if exists "staff_permissions_admin_write" on staff_permissions;
create policy "staff_permissions_admin_write" on staff_permissions
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on role_permissions to authenticated;
grant select, insert, update, delete on staff_permissions to authenticated;

-- Defaults reproduce today's behaviour; admins can change them at /admin/access.
insert into role_permissions (role, permission) values
  ('editor', 'billing.manage'),
  ('editor', 'billing.draft'),
  ('editor', 'clients.manage'),
  ('editor', 'website'),
  ('junior_partner', 'billing.manage'),
  ('junior_partner', 'billing.draft'),
  ('junior_partner', 'clients.manage'),
  ('junior_partner', 'website'),
  ('junior_partner', 'crm'),
  ('employee', 'billing.draft')
on conflict do nothing;

-- Audit rows written by people outside the CMS tier were silently dropped.
drop policy if exists "audit_logs_team_insert" on audit_logs;
create policy "audit_logs_team_insert" on audit_logs
  for insert with check (is_team_member() and actor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Website content follows the `website` permission
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'services', 'projects', 'blog_posts', 'team_members',
    'reviews', 'stats', 'social_links', 'seo_settings'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_staff_write', t);
    execute format('drop policy if exists %I on %I', t || '_website_write', t);
    execute format(
      'create policy %I on %I for all using (has_permission(''website'')) with check (has_permission(''website''))',
      t || '_website_write', t
    );
  end loop;
end;
$$;

drop policy if exists "job_openings_staff_write" on job_openings;
drop policy if exists "job_openings_website_write" on job_openings;
create policy "job_openings_website_write" on job_openings
  for all using (has_permission('website')) with check (has_permission('website'));

drop policy if exists "faqs_staff_write" on faqs;
drop policy if exists "faqs_website_write" on faqs;
create policy "faqs_website_write" on faqs
  for all using (has_permission('website')) with check (has_permission('website'));

-- Settings hold billing, HR and site copy, so any of those tiers may write.
drop policy if exists "site_settings_staff_write" on site_settings;
create policy "site_settings_staff_write" on site_settings
  for all using (is_staff() or has_permission('website'))
  with check (is_staff() or has_permission('website'));

drop policy if exists "media_assets_website_manage" on media_assets;
create policy "media_assets_website_manage" on media_assets
  for all using (has_permission('website')) with check (has_permission('website'));

drop policy if exists "public_media_website_write" on storage.objects;
create policy "public_media_website_write" on storage.objects
  for insert with check (bucket_id = 'public-media' and has_permission('website'));

-- ===========================================================================
-- 2. Billing access follows billing.manage / billing.draft
-- ===========================================================================

drop policy if exists "billing_items_staff_manage" on billing_items;
drop policy if exists "billing_items_manage" on billing_items;
create policy "billing_items_manage" on billing_items
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));

drop policy if exists "billing_packages_staff_manage" on billing_packages;
drop policy if exists "billing_packages_manage" on billing_packages;
create policy "billing_packages_manage" on billing_packages
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));

drop policy if exists "billing_documents_staff_manage" on billing_documents;
drop policy if exists "billing_documents_manage" on billing_documents;
create policy "billing_documents_manage" on billing_documents
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));

drop policy if exists "billing_document_items_staff_manage" on billing_document_items;
drop policy if exists "billing_document_items_manage" on billing_document_items;
create policy "billing_document_items_manage" on billing_document_items
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));

-- Drafting rights move from a hard-coded role list to billing.draft.
drop policy if exists "billing_documents_own_draft_read" on billing_documents;
create policy "billing_documents_own_draft_read" on billing_documents
  for select using (created_by = auth.uid() and has_permission('billing.draft'));

drop policy if exists "billing_documents_own_draft_insert" on billing_documents;
create policy "billing_documents_own_draft_insert" on billing_documents
  for insert with check (
    created_by = auth.uid() and doc_type = 'quote' and status = 'draft' and has_permission('billing.draft')
  );

drop policy if exists "billing_documents_own_draft_update" on billing_documents;
create policy "billing_documents_own_draft_update" on billing_documents
  for update using (created_by = auth.uid() and status = 'draft' and has_permission('billing.draft'))
  with check (created_by = auth.uid() and status = 'draft');

drop policy if exists "billing_documents_own_draft_delete" on billing_documents;
create policy "billing_documents_own_draft_delete" on billing_documents
  for delete using (created_by = auth.uid() and status = 'draft' and has_permission('billing.draft'));

drop policy if exists "billing_document_items_own_draft" on billing_document_items;
create policy "billing_document_items_own_draft" on billing_document_items
  for all using (
    has_permission('billing.draft')
    and exists (
      select 1 from billing_documents d
      where d.id = document_id and d.created_by = auth.uid() and d.status = 'draft'
    )
  ) with check (
    has_permission('billing.draft')
    and exists (
      select 1 from billing_documents d
      where d.id = document_id and d.created_by = auth.uid() and d.status = 'draft'
    )
  );

-- ===========================================================================
-- 3. Quote -> invoice workflow
-- ===========================================================================

alter table billing_documents
  add column if not exists source_quote_id uuid references billing_documents (id) on delete set null,
  add column if not exists invoice_kind text not null default 'standard',
  add column if not exists engagement_id uuid references client_engagements (id) on delete set null,
  add column if not exists amount_paid numeric(14, 2) not null default 0,
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by_name text;

alter table billing_documents drop constraint if exists billing_documents_invoice_kind_check;
alter table billing_documents
  add constraint billing_documents_invoice_kind_check
  check (invoice_kind in ('standard', 'advance', 'milestone', 'balance', 'recurring'));

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'billing_documents' and column_name = 'balance_due'
  ) then
    alter table billing_documents
      add column balance_due numeric(14, 2) generated always as (total - amount_paid) stored;
  end if;
end;
$$;

create index if not exists billing_documents_source_quote_idx on billing_documents (source_quote_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table if not exists billing_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references billing_documents (id) on delete cascade,
  client_id uuid references clients (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'INR',
  paid_on date not null default current_date,
  method text not null default 'bank_transfer',
  reference text,
  notes text,
  recorded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint billing_payments_method_check
    check (method in ('bank_transfer', 'upi', 'cash', 'card', 'cheque', 'gateway', 'other'))
);
create index if not exists billing_payments_document_idx on billing_payments (document_id, paid_on);
create index if not exists billing_payments_client_idx on billing_payments (client_id, paid_on desc);

-- Payments inherit the client and currency of their invoice.
create or replace function public.billing_payment_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select client_id, currency into new.client_id, new.currency
  from billing_documents where id = new.document_id;
  return new;
end;
$$;

drop trigger if exists billing_payments_defaults on billing_payments;
create trigger billing_payments_defaults
  before insert or update on billing_payments
  for each row execute procedure public.billing_payment_defaults();

-- Keeps amount_paid and the paid / partially_paid status in step with payments.
create or replace function public.refresh_billing_document_payments(doc uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid numeric(14, 2);
begin
  -- Callable over RPC after an invoice is edited; only billing users may trigger it.
  if not public.has_permission('billing.manage') then
    return;
  end if;

  select coalesce(sum(amount), 0) into paid from billing_payments where document_id = doc;

  update billing_documents d
     set amount_paid = paid,
         status = case
           when d.doc_type <> 'invoice' or d.status in ('draft', 'cancelled') then d.status
           when paid >= d.total and d.total > 0 then 'paid'::billing_doc_status
           when paid > 0 then 'partially_paid'::billing_doc_status
           when d.status in ('paid', 'partially_paid') then 'sent'::billing_doc_status
           else d.status
         end
   where d.id = doc;
end;
$$;

revoke all on function public.refresh_billing_document_payments(uuid) from public;
grant execute on function public.refresh_billing_document_payments(uuid) to authenticated;

create or replace function public.billing_payments_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_billing_document_payments(old.document_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_billing_document_payments(new.document_id);
  end if;
  return null;
end;
$$;

drop trigger if exists billing_payments_sync on billing_payments;
create trigger billing_payments_sync
  after insert or update or delete on billing_payments
  for each row execute procedure public.billing_payments_changed();

alter table billing_payments enable row level security;

drop policy if exists "billing_payments_manage" on billing_payments;
create policy "billing_payments_manage" on billing_payments
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));

drop policy if exists "billing_payments_client_read" on billing_payments;
create policy "billing_payments_client_read" on billing_payments
  for select using (client_id is not null and client_id = my_client_id());

grant select, insert, update, delete on billing_payments to authenticated;

-- ---------------------------------------------------------------------------
-- Document guard: billing.manage replaces is_staff(); clients may only accept
-- a quote through client_accept_quote().
-- ---------------------------------------------------------------------------

create or replace function public.enforce_billing_document_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() = 'client' then
    if coalesce(current_setting('lynvo.client_accept', true), '') <> 'on' then
      raise exception 'Clients cannot modify billing documents';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if not public.has_permission('billing.manage') then
    new.status := old.status;
    new.doc_type := old.doc_type;
    new.number := old.number;
    new.created_by := old.created_by;
    new.client_id := old.client_id;
    new.amount_paid := old.amount_paid;
    new.source_quote_id := old.source_quote_id;
  end if;

  if new.status = 'sent' and old.status is distinct from 'sent' and new.sent_at is null then
    new.sent_at := now();
  end if;
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.accepted_at is null then
    new.accepted_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.client_accept_quote(doc uuid, signer text)
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
    raise exception 'Only a client can accept a quote';
  end if;

  perform set_config('lynvo.client_accept', 'on', true);

  update billing_documents
     set status = 'accepted',
         accepted_at = now(),
         accepted_by_name = nullif(trim(signer), '')
   where id = doc
     and client_id = me
     and doc_type = 'quote'
     and status = 'sent';
  -- Read the row count before PERFORM, which would overwrite FOUND.
  get diagnostics changed = row_count;

  perform set_config('lynvo.client_accept', 'off', true);
  return changed > 0;
end;
$$;

revoke all on function public.client_accept_quote(uuid, text) from public;
grant execute on function public.client_accept_quote(uuid, text) to authenticated;

-- Clients now see partially paid invoices too.
drop policy if exists "billing_documents_client_read" on billing_documents;
create policy "billing_documents_client_read" on billing_documents
  for select using (
    client_id is not null
    and client_id = my_client_id()
    and status in ('sent', 'accepted', 'partially_paid', 'paid', 'overdue')
  );

drop policy if exists "billing_document_items_client_read" on billing_document_items;
create policy "billing_document_items_client_read" on billing_document_items
  for select using (
    exists (
      select 1 from billing_documents d
      where d.id = document_id
        and d.client_id is not null
        and d.client_id = my_client_id()
        and d.status in ('sent', 'accepted', 'partially_paid', 'paid', 'overdue')
    )
  );

insert into site_settings (key, value) values
  ('billing_advance_percent', jsonb_build_object('text', '40')),
  ('billing_receipt_note', jsonb_build_object('text', 'Thank you for your payment. This receipt is computer generated and valid without a signature.'))
on conflict (key) do nothing;

-- ===========================================================================
-- 4. Client accounts
-- ===========================================================================

alter table clients
  add column if not exists gstin text,
  add column if not exists region text not null default 'IN',
  add column if not exists industry text;

alter table clients drop constraint if exists clients_region_check;
alter table clients add constraint clients_region_check check (region in ('IN', 'INT'));

-- Client records follow clients.manage instead of the CMS tier.
do $$
declare
  t text;
begin
  foreach t in array array['clients', 'client_engagements', 'client_milestones', 'client_deliverables', 'client_reports'] loop
    execute format('drop policy if exists %I on %I', t || '_staff_manage', t);
    execute format('drop policy if exists %I on %I', t || '_perm_manage', t);
    execute format(
      'create policy %I on %I for all using (has_permission(''clients.manage'')) with check (has_permission(''clients.manage''))',
      t || '_perm_manage', t
    );
  end loop;
end;
$$;

-- Billing users need the client list to address documents and auto-create accounts.
drop policy if exists "clients_billing_read" on clients;
create policy "clients_billing_read" on clients
  for select using (has_permission('billing.manage') or has_permission('billing.draft'));
drop policy if exists "clients_billing_insert" on clients;
create policy "clients_billing_insert" on clients
  for insert with check (has_permission('billing.manage'));

create or replace function public.enforce_deliverable_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('clients.manage') then
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

-- Every billed client gets an account. Documents are matched by name.
insert into clients (name, email, phone, address, gstin, region, created_by)
select distinct on (lower(trim(d.client_name)))
       trim(d.client_name), d.client_email, d.client_phone, d.client_address, d.client_gstin, d.region, d.created_by
  from billing_documents d
 where d.client_id is null
   and trim(d.client_name) <> ''
   and not exists (select 1 from clients c where lower(trim(c.name)) = lower(trim(d.client_name)))
 order by lower(trim(d.client_name)), d.issue_date desc;

update billing_documents d
   set client_id = c.id
  from clients c
 where d.client_id is null
   and lower(trim(c.name)) = lower(trim(d.client_name));

-- ---------------------------------------------------------------------------
-- Recurring subscriptions: maintenance, hosting, retainers
-- ---------------------------------------------------------------------------

create table if not exists client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'Maintenance',
  amount numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  currency text not null default 'INR',
  cycle text not null default 'monthly',
  start_date date not null default current_date,
  next_invoice_on date,
  status text not null default 'active',
  last_invoice_id uuid references billing_documents (id) on delete set null,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_subscriptions_cycle_check check (cycle in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  constraint client_subscriptions_status_check check (status in ('active', 'paused', 'cancelled'))
);
create index if not exists client_subscriptions_client_idx on client_subscriptions (client_id, status);
create index if not exists client_subscriptions_due_idx on client_subscriptions (next_invoice_on) where status = 'active';

alter table client_subscriptions enable row level security;

drop policy if exists "client_subscriptions_manage" on client_subscriptions;
create policy "client_subscriptions_manage" on client_subscriptions
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));

drop policy if exists "client_subscriptions_staff_read" on client_subscriptions;
create policy "client_subscriptions_staff_read" on client_subscriptions
  for select using (has_permission('clients.manage'));

drop policy if exists "client_subscriptions_client_read" on client_subscriptions;
create policy "client_subscriptions_client_read" on client_subscriptions
  for select using (client_id = my_client_id() and status <> 'cancelled');

grant select, insert, update, delete on client_subscriptions to authenticated;

-- ===========================================================================
-- 5. Graphic design, stationery and brand identity catalogue
-- ===========================================================================

update billing_items set name = 'Logo Design — Standard', description = '3 concepts, 3 revision rounds, final files in all formats.'
 where code = 'brand-logo';
update billing_items set name = 'Business Card Design', description = 'Double-sided, print-ready with bleed.', category = 'Stationery'
 where code = 'brand-business-card';
update billing_items set category = 'Graphic Design' where code = 'brand-social-kit';

with catalog(code, name, description, category, unit, price_in, price_int, price_from, recurring) as (
  values
    -- Brand identity -------------------------------------------------------
    ('brand-logo-essential', 'Logo Design — Essential', '2 concepts, 2 revision rounds, PNG/SVG/PDF exports.', 'Brand Identity', 'design', 3000, 99, false, 'one_time'),
    ('brand-logo-premium', 'Logo Design — Premium', '5 concepts, research moodboard, unlimited revisions within scope.', 'Brand Identity', 'design', 12000, 399, false, 'one_time'),
    ('brand-logo-redesign', 'Logo Redesign / Refresh', 'Modernise an existing mark while keeping recognition.', 'Brand Identity', 'design', 4000, 129, false, 'one_time'),
    ('brand-logo-variations', 'Logo Variations', 'Horizontal, stacked, icon-only, mono and reversed versions.', 'Brand Identity', 'set', 1500, 49, false, 'one_time'),
    ('brand-wordmark', 'Wordmark / Logotype', 'Custom lettering-based logo.', 'Brand Identity', 'design', 3500, 119, false, 'one_time'),
    ('brand-monogram', 'Monogram / Icon Mark', 'Standalone symbol for apps, favicons and social avatars.', 'Brand Identity', 'design', 2500, 79, false, 'one_time'),
    ('brand-mascot', 'Mascot / Character Logo', 'Illustrated character mark.', 'Brand Identity', 'design', 8000, 249, true, 'one_time'),
    ('brand-guidelines', 'Brand Guidelines Book', 'Logo usage, colour, typography, imagery and tone of voice (15–25 pages).', 'Brand Identity', 'document', 6000, 199, false, 'one_time'),
    ('brand-style-guide', 'Mini Brand Style Guide', 'One-page reference sheet for logo, colours and fonts.', 'Brand Identity', 'document', 2000, 69, false, 'one_time'),
    ('brand-color-palette', 'Colour Palette System', 'Primary, secondary and neutral palette with HEX/RGB/CMYK.', 'Brand Identity', 'set', 1000, 35, false, 'one_time'),
    ('brand-typography', 'Typography System', 'Heading and body font pairing with hierarchy rules.', 'Brand Identity', 'set', 1000, 35, false, 'one_time'),
    ('brand-strategy', 'Brand Strategy & Positioning Workshop', 'Audience, competitors, positioning and personality.', 'Brand Identity', 'workshop', 5000, 175, true, 'one_time'),
    ('brand-naming', 'Brand Naming', 'Shortlist of names with domain and social handle checks.', 'Brand Identity', 'project', 5000, 175, true, 'one_time'),
    ('brand-tagline', 'Tagline / Slogan Writing', '5 options with rationale.', 'Brand Identity', 'project', 1500, 50, false, 'one_time'),
    ('brand-voice', 'Brand Voice & Messaging Guide', 'Tone, key messages and sample copy.', 'Brand Identity', 'document', 3000, 99, false, 'one_time'),
    ('brand-favicon', 'Favicon & App Icon Set', 'All sizes for web, iOS and Android.', 'Brand Identity', 'set', 750, 25, false, 'one_time'),
    ('brand-mockups', 'Brand Presentation Mockups', 'Logo and stationery shown on realistic mockups (set of 6).', 'Brand Identity', 'set', 1000, 35, false, 'one_time'),

    -- Stationery -----------------------------------------------------------
    ('stat-letterhead', 'Letterhead Design', 'A4 print-ready plus editable Word / Google Docs version.', 'Stationery', 'design', 1000, 30, false, 'one_time'),
    ('stat-envelope', 'Envelope Design', 'DL / C4 envelope artwork.', 'Stationery', 'design', 750, 25, false, 'one_time'),
    ('stat-email-signature', 'Email Signature', 'HTML signature for Gmail / Outlook.', 'Stationery', 'design', 1000, 35, false, 'one_time'),
    ('stat-invoice-template', 'Invoice / Quotation Template', 'Branded, editable document template.', 'Stationery', 'template', 1500, 49, false, 'one_time'),
    ('stat-id-card', 'ID Card Design', 'Front and back, per layout.', 'Stationery', 'design', 750, 25, false, 'one_time'),
    ('stat-certificate', 'Certificate Design', 'Award or completion certificate template.', 'Stationery', 'design', 750, 25, false, 'one_time'),
    ('stat-kit', 'Stationery Kit', 'Business card, letterhead, envelope and email signature.', 'Stationery', 'kit', 3000, 99, false, 'one_time'),
    ('stat-deck-template', 'Presentation Template', 'Master slides for PowerPoint / Google Slides (15 layouts).', 'Stationery', 'template', 3000, 99, false, 'one_time'),
    ('stat-pitch-deck', 'Pitch Deck Design', 'Custom-designed investor or sales slides.', 'Stationery', 'slide', 300, 10, false, 'one_time'),

    -- Graphic design -------------------------------------------------------
    ('gfx-social-post', 'Social Media Post', 'Single static post, 2 revisions.', 'Graphic Design', 'post', 300, 10, false, 'one_time'),
    ('gfx-carousel', 'Carousel Post', 'Up to 5 slides.', 'Graphic Design', 'post', 800, 25, false, 'one_time'),
    ('gfx-story', 'Story / Reel Cover', '9:16 vertical graphic.', 'Graphic Design', 'design', 250, 8, false, 'one_time'),
    ('gfx-social-templates', 'Social Post Templates', 'Editable Canva / Figma templates (set of 5).', 'Graphic Design', 'set', 2000, 69, false, 'one_time'),
    ('gfx-profile-banners', 'Profile & Cover Banners', 'Facebook, LinkedIn, YouTube and X covers.', 'Graphic Design', 'set', 1000, 35, false, 'one_time'),
    ('gfx-flyer', 'Flyer / Leaflet', 'A5 or A4, single-sided.', 'Graphic Design', 'design', 1000, 35, false, 'one_time'),
    ('gfx-brochure-bifold', 'Brochure — Bi-fold', '4 panels, print-ready.', 'Graphic Design', 'design', 2500, 79, false, 'one_time'),
    ('gfx-brochure-trifold', 'Brochure — Tri-fold', '6 panels, print-ready.', 'Graphic Design', 'design', 3000, 99, false, 'one_time'),
    ('gfx-catalogue-page', 'Catalogue / Company Profile Page', 'Per page, layout and typesetting.', 'Graphic Design', 'page', 500, 15, false, 'one_time'),
    ('gfx-poster', 'Poster Design', 'A3 / A2 print or digital.', 'Graphic Design', 'design', 1500, 49, false, 'one_time'),
    ('gfx-standee', 'Banner / Standee / Roll-up', 'Large-format print artwork.', 'Graphic Design', 'design', 1500, 49, false, 'one_time'),
    ('gfx-hoarding', 'Hoarding / Billboard', 'Outdoor large-format artwork.', 'Graphic Design', 'design', 3000, 99, false, 'one_time'),
    ('gfx-menu', 'Menu Card Design', 'Restaurant or café menu.', 'Graphic Design', 'design', 2000, 69, true, 'one_time'),
    ('gfx-packaging', 'Packaging Design', 'Box, pouch or bottle dieline artwork.', 'Graphic Design', 'design', 4000, 129, true, 'one_time'),
    ('gfx-label', 'Product Label / Sticker', 'Single SKU label.', 'Graphic Design', 'design', 1500, 49, false, 'one_time'),
    ('gfx-merch', 'Merchandise / T-shirt Design', 'Apparel and merchandise artwork.', 'Graphic Design', 'design', 1000, 35, false, 'one_time'),
    ('gfx-infographic', 'Infographic', 'Data or process explained visually.', 'Graphic Design', 'design', 2000, 69, false, 'one_time'),
    ('gfx-icon-set', 'Custom Icon Set', 'Up to 10 matching icons.', 'Graphic Design', 'set', 3000, 99, false, 'one_time'),
    ('gfx-illustration', 'Custom Illustration', 'Spot or hero illustration.', 'Graphic Design', 'illustration', 2500, 79, true, 'one_time'),
    ('gfx-web-banner', 'Website Banner / Hero Graphic', 'Desktop and mobile crops.', 'Graphic Design', 'design', 750, 25, false, 'one_time'),
    ('gfx-ad-creatives', 'Ad Creative Set', 'One concept in 3 ad sizes (Meta / Google).', 'Graphic Design', 'set', 1500, 49, false, 'one_time'),
    ('gfx-newsletter', 'Email Newsletter Design', 'Responsive email template.', 'Graphic Design', 'design', 1500, 49, false, 'one_time'),
    ('gfx-ebook', 'eBook / Report Layout', 'Per page, typeset and designed.', 'Graphic Design', 'page', 300, 10, false, 'one_time'),
    ('gfx-invitation', 'Invitation / Greeting Design', 'Digital or print invitation.', 'Graphic Design', 'design', 750, 25, false, 'one_time'),
    ('gfx-photo-retouch', 'Photo Retouching', 'Per image: cleanup, colour and background removal.', 'Graphic Design', 'image', 150, 5, false, 'one_time'),
    ('gfx-product-mockups', 'Product Mockups', 'Set of 5 realistic mockups.', 'Graphic Design', 'set', 1000, 35, false, 'one_time'),

    -- Motion & video -------------------------------------------------------
    ('motion-logo', 'Logo Animation', '3–5 second animated logo sting.', 'Motion & Video', 'animation', 3000, 99, false, 'one_time'),
    ('motion-post', 'Animated Social Post', 'Short looping motion graphic.', 'Motion & Video', 'post', 1200, 39, false, 'one_time'),
    ('motion-reel-edit', 'Short Video / Reel Edit', 'Up to 60 seconds, captions and music.', 'Motion & Video', 'video', 1500, 49, false, 'one_time'),
    ('motion-explainer', 'Explainer Video', '60–90 second animated explainer.', 'Motion & Video', 'video', 12000, 399, true, 'one_time'),

    -- Design retainers -----------------------------------------------------
    ('retainer-social-design', 'Social Media Design Retainer', '12 posts per month with captions.', 'Graphic Design', 'month', 4999, 179, false, 'monthly'),
    ('retainer-social-growth', 'Social Media Growth Retainer', '20 posts + 4 reels per month.', 'Graphic Design', 'month', 9999, 349, false, 'monthly'),
    ('retainer-graphic-design', 'Graphic Design Retainer', 'Up to 20 design hours per month.', 'Graphic Design', 'month', 14999, 499, false, 'monthly')
),
numbered as (
  select c.*, 5000 + (row_number() over ())::int * 10 as ord from catalog c
)
insert into billing_items (
  code, name, description, category, unit, unit_price, unit_price_intl, price_from, recurring, "order", active, optional
)
select code, name, description, category, unit, price_in, price_int, price_from, recurring, ord, true, true
from numbered
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  unit = excluded.unit,
  unit_price = excluded.unit_price,
  unit_price_intl = excluded.unit_price_intl,
  price_from = excluded.price_from,
  recurring = excluded.recurring,
  "order" = excluded."order",
  updated_at = now();

insert into billing_packages (code, name, category, description, price_inr, price_intl, price_from, recurring, badge, includes, "order")
values
  ('pkg-brand-starter', 'Brand Starter', 'Brand Identity',
   'For new businesses that need a professional look fast.',
   7999, 269, false, 'one_time', null,
   '["Logo design (2 concepts, 2 revisions)","Logo variations","Colour palette","Typography system","Business card design","Letterhead design","Social profile & cover banners","Favicon set","Final files in all formats"]'::jsonb,
   200),
  ('pkg-brand-identity', 'Brand Identity', 'Brand Identity',
   'A complete, consistent identity across print and digital.',
   17999, 599, false, 'one_time', 'Most popular',
   '["Logo design (3 concepts, 3 revisions)","Full logo variation set","Mini brand style guide","Stationery kit: card, letterhead, envelope, email signature","Social media kit","5 editable social post templates","Brand presentation mockups","Source files and usage rights"]'::jsonb,
   210),
  ('pkg-brand-pro', 'Brand Identity Pro', 'Brand Identity',
   'Strategy-led branding for companies ready to scale.',
   34999, 1199, false, 'one_time', null,
   '["Brand strategy & positioning workshop","Premium logo design (5 concepts)","Brand guidelines book","Brand voice & messaging guide","Complete stationery kit","Packaging or label design (1 SKU)","Social media kit + 10 templates","Presentation template","Logo animation","Source files and full ownership transfer"]'::jsonb,
   220),
  ('pkg-launch-bundle', 'Launch Bundle (Brand + Website)', 'Package',
   'Everything a new venture needs to go live online.',
   22999, 799, false, 'one_time', null,
   '["Brand Starter identity","Starter website (up to 5 pages)","Google Business Profile setup","Social media kit","WhatsApp & contact integration","Basic SEO","Deployment and SSL"]'::jsonb,
   230),
  ('pkg-social-design', 'Social Media Design', 'Retainer',
   'Monthly social content design.',
   4999, 179, false, 'monthly', null,
   '["12 designed posts per month","Captions and hashtags","Monthly content calendar","2 revision rounds per post"]'::jsonb,
   240)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  price_inr = excluded.price_inr,
  price_intl = excluded.price_intl,
  price_from = excluded.price_from,
  recurring = excluded.recurring,
  badge = excluded.badge,
  includes = excluded.includes,
  "order" = excluded."order",
  updated_at = now();

-- People who manage client accounts can read (not change) those clients' billing.
drop policy if exists "billing_documents_clients_read" on billing_documents;
create policy "billing_documents_clients_read" on billing_documents
  for select using (has_permission('clients.manage') and client_id is not null);

drop policy if exists "billing_document_items_clients_read" on billing_document_items;
create policy "billing_document_items_clients_read" on billing_document_items
  for select using (
    has_permission('clients.manage')
    and exists (select 1 from billing_documents d where d.id = document_id and d.client_id is not null)
  );

drop policy if exists "billing_payments_clients_read" on billing_payments;
create policy "billing_payments_clients_read" on billing_payments
  for select using (has_permission('clients.manage'));
