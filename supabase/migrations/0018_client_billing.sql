-- LYNVO client portal, phase 8: clients can read the quotes and invoices
-- addressed to them once staff have issued them.

alter table billing_documents
  add column if not exists client_id uuid references clients (id) on delete set null;

create index if not exists billing_documents_client_idx on billing_documents (client_id, issue_date desc);

-- Drafts and cancelled documents stay internal.
drop policy if exists "billing_documents_client_read" on billing_documents;
create policy "billing_documents_client_read" on billing_documents
  for select using (
    client_id is not null
    and client_id = my_client_id()
    and status in ('sent', 'accepted', 'paid', 'overdue')
  );

drop policy if exists "billing_document_items_client_read" on billing_document_items;
create policy "billing_document_items_client_read" on billing_document_items
  for select using (
    exists (
      select 1 from billing_documents d
      where d.id = document_id
        and d.client_id is not null
        and d.client_id = my_client_id()
        and d.status in ('sent', 'accepted', 'paid', 'overdue')
    )
  );

-- A client must never be able to alter a document; the existing update trigger
-- only guards staff fields, so block the write paths at the role level.
create or replace function public.enforce_billing_document_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() = 'client' then
    raise exception 'Clients cannot modify billing documents';
  end if;

  if not public.is_staff() then
    new.status := old.status;
    new.doc_type := old.doc_type;
    new.number := old.number;
    new.created_by := old.created_by;
    new.client_id := old.client_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
