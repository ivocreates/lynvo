-- LYNVO team platform, phase 6: staff-drafted quotes.
--
-- Employees and interns can prepare a quote for a client, but only editors and
-- above may send it. A drafter keeps access to their own quote for as long as
-- it stays in draft.

-- Presets are needed to build a quote, so everyone on the team can read them.
drop policy if exists "billing_items_team_read" on billing_items;
create policy "billing_items_team_read" on billing_items
  for select using (is_team_member());

-- ---------------------------------------------------------------------------
-- Own draft quotes
-- ---------------------------------------------------------------------------

drop policy if exists "billing_documents_own_draft_read" on billing_documents;
create policy "billing_documents_own_draft_read" on billing_documents
  for select using (created_by = auth.uid());

drop policy if exists "billing_documents_own_draft_insert" on billing_documents;
create policy "billing_documents_own_draft_insert" on billing_documents
  for insert with check (
    is_team_member()
    and created_by = auth.uid()
    and doc_type = 'quote'
    and status = 'draft'
  );

drop policy if exists "billing_documents_own_draft_update" on billing_documents;
create policy "billing_documents_own_draft_update" on billing_documents
  for update using (created_by = auth.uid() and status = 'draft')
  with check (created_by = auth.uid() and status = 'draft');

drop policy if exists "billing_documents_own_draft_delete" on billing_documents;
create policy "billing_documents_own_draft_delete" on billing_documents
  for delete using (created_by = auth.uid() and status = 'draft');

-- Line items follow whatever access the parent document grants.
drop policy if exists "billing_document_items_own_draft" on billing_document_items;
create policy "billing_document_items_own_draft" on billing_document_items
  for all using (
    exists (
      select 1 from billing_documents d
      where d.id = document_id and d.created_by = auth.uid() and d.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from billing_documents d
      where d.id = document_id and d.created_by = auth.uid() and d.status = 'draft'
    )
  );

-- ---------------------------------------------------------------------------
-- A drafter must not be able to promote their own quote
-- ---------------------------------------------------------------------------

create or replace function public.enforce_billing_document_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    new.status := old.status;
    new.doc_type := old.doc_type;
    new.number := old.number;
    new.created_by := old.created_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists billing_documents_enforce_update on billing_documents;
create trigger billing_documents_enforce_update
  before update on billing_documents
  for each row execute procedure public.enforce_billing_document_update();
