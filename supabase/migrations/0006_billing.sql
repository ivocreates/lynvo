-- LYNVO billing: quote and invoice generation
--
-- Documents are staff-only: no anonymous policy is created, so RLS denies
-- every public read by default.

create type billing_doc_type as enum ('quote', 'invoice');
create type billing_doc_status as enum ('draft', 'sent', 'accepted', 'paid', 'overdue', 'cancelled');

-- ---------------------------------------------------------------------------
-- Preset catalogue: reusable line items with default pricing
-- ---------------------------------------------------------------------------

create table billing_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  unit text not null default 'unit',
  unit_price numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  hsn_sac text,
  active boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index billing_items_active_idx on billing_items ("order") where active = true;

-- ---------------------------------------------------------------------------
-- Quotes and invoices
-- ---------------------------------------------------------------------------

create table billing_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type billing_doc_type not null,
  number text not null,
  status billing_doc_status not null default 'draft',
  issue_date date not null default current_date,
  -- Due date for invoices, validity date for quotes.
  due_date date,

  client_name text not null,
  client_email text,
  client_phone text,
  client_address text,
  client_gstin text,

  currency text not null default 'INR',
  -- Flat amount taken off the subtotal before tax.
  discount_amount numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,

  notes text,
  terms text,

  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index billing_documents_number_idx on billing_documents (lower(number));
create index billing_documents_type_idx on billing_documents (doc_type, issue_date desc);

create table billing_document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references billing_documents (id) on delete cascade,
  position int not null default 0,
  name text not null,
  description text,
  unit text,
  hsn_sac text,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  line_total numeric(14, 2) not null default 0
);
create index billing_document_items_doc_idx on billing_document_items (document_id, position);

-- ---------------------------------------------------------------------------
-- Row Level Security — staff only, no public access
-- ---------------------------------------------------------------------------

alter table billing_items enable row level security;
alter table billing_documents enable row level security;
alter table billing_document_items enable row level security;

create policy "billing_items_staff_manage" on billing_items
  for all using (is_staff()) with check (is_staff());

create policy "billing_documents_staff_manage" on billing_documents
  for all using (is_staff()) with check (is_staff());

create policy "billing_document_items_staff_manage" on billing_document_items
  for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------------------
-- Letterhead / footer defaults (editable at /admin/billing/settings)
-- ---------------------------------------------------------------------------

insert into site_settings (key, value) values
  ('billing_legal_name', jsonb_build_object('text', 'LYNVO LLP')),
  ('billing_brand_name', jsonb_build_object('text', 'LYNVO')),
  ('billing_llpin', jsonb_build_object('text', '')),
  ('billing_gstin', jsonb_build_object('text', '')),
  ('billing_pan', jsonb_build_object('text', '')),
  ('billing_registered_address', jsonb_build_object('text', '')),
  ('billing_email', jsonb_build_object('text', '')),
  ('billing_phone', jsonb_build_object('text', '')),
  ('billing_website', jsonb_build_object('text', 'https://lynvo.tech')),
  ('billing_logo_url', jsonb_build_object('text', '')),
  ('billing_bank_details', jsonb_build_object('text', '')),
  ('billing_currency', jsonb_build_object('text', 'INR')),
  ('billing_quote_prefix', jsonb_build_object('text', 'LYNVO/QT')),
  ('billing_invoice_prefix', jsonb_build_object('text', 'LYNVO/INV')),
  ('billing_quote_terms', jsonb_build_object('text', 'This quotation is valid for 30 days from the date of issue. Prices are exclusive of taxes unless stated otherwise.')),
  ('billing_invoice_terms', jsonb_build_object('text', 'Payment is due within 15 days of the invoice date. Please quote the invoice number with your remittance.')),
  ('billing_footer_legal', jsonb_build_object('text', 'LYNVO LLP is a limited liability partnership registered in India. This document is computer generated and valid without a signature.'))
on conflict (key) do nothing;
