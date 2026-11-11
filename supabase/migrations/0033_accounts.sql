-- LYNVO platform, phase 14: bookkeeping.
--
--   * ledger_entries: income and expenses recorded by hand (including past
--     years), with GST and TDS, for the P&L, GST and tax reports.
--   * Payments against invoices stay in billing_payments and are counted as
--     income automatically; they can now carry TDS deducted by the client.
--   * Access follows the new `accounts` permission (admins have it by default).

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null,
  entry_date date not null default current_date,
  category text not null default 'Other',
  party_name text,
  party_gstin text,
  description text,
  -- Total that moved (incl. GST, before TDS).
  amount numeric(14, 2) not null check (amount >= 0),
  gst_rate numeric(5, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  tds_amount numeric(14, 2) not null default 0,
  currency text not null default 'INR',
  payment_method text not null default 'bank_transfer',
  reference text,
  bill_number text,
  client_id uuid references clients (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ledger_entries_type_check check (entry_type in ('income', 'expense')),
  constraint ledger_entries_method_check
    check (payment_method in ('bank_transfer', 'upi', 'cash', 'card', 'cheque', 'gateway', 'other'))
);

create index if not exists ledger_entries_date_idx on ledger_entries (entry_date desc);
create index if not exists ledger_entries_type_idx on ledger_entries (entry_type, category);

alter table ledger_entries enable row level security;

drop policy if exists "ledger_entries_manage" on ledger_entries;
create policy "ledger_entries_manage" on ledger_entries
  for all using (has_permission('accounts')) with check (has_permission('accounts'));

grant select, insert, update, delete on ledger_entries to authenticated;

-- Accounts users read billing to build the reports.
drop policy if exists "billing_documents_accounts_read" on billing_documents;
create policy "billing_documents_accounts_read" on billing_documents
  for select using (has_permission('accounts'));
drop policy if exists "billing_payments_accounts_read" on billing_payments;
create policy "billing_payments_accounts_read" on billing_payments
  for select using (has_permission('accounts'));

-- ---------------------------------------------------------------------------
-- TDS on invoice payments: a client paying ₹90,000 + ₹10,000 TDS settles ₹1,00,000.
-- ---------------------------------------------------------------------------

alter table billing_payments add column if not exists tds_amount numeric(14, 2) not null default 0;

alter table billing_payments drop constraint if exists billing_payments_amount_check;
alter table billing_payments
  add constraint billing_payments_amount_check check (amount >= 0 and tds_amount >= 0 and amount + tds_amount > 0);

create or replace function public.refresh_billing_document_payments(doc uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid numeric(14, 2);
begin
  if not public.has_permission('billing.manage') then
    return;
  end if;

  select coalesce(sum(amount + tds_amount), 0) into paid from billing_payments where document_id = doc;

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
