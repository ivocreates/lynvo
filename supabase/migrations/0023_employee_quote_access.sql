-- Only employees and above may prepare staff quotes. Interns remain team members
-- for the rest of the staff workspace but cannot access quote drafts.

drop policy if exists "billing_documents_own_draft_read" on billing_documents;
create policy "billing_documents_own_draft_read" on billing_documents
  for select using (
    created_by = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and is_active = true
        and role in ('employee', 'editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
    )
  );

drop policy if exists "billing_documents_own_draft_insert" on billing_documents;
create policy "billing_documents_own_draft_insert" on billing_documents
  for insert with check (
    created_by = auth.uid()
    and doc_type = 'quote'
    and status = 'draft'
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and is_active = true
        and role in ('employee', 'editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
    )
  );

drop policy if exists "billing_documents_own_draft_update" on billing_documents;
create policy "billing_documents_own_draft_update" on billing_documents
  for update using (
    created_by = auth.uid()
    and status = 'draft'
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and is_active = true
        and role in ('employee', 'editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
    )
  ) with check (created_by = auth.uid() and status = 'draft');

drop policy if exists "billing_documents_own_draft_delete" on billing_documents;
create policy "billing_documents_own_draft_delete" on billing_documents
  for delete using (
    created_by = auth.uid()
    and status = 'draft'
    and exists (
      select 1 from profiles
      where id = auth.uid()
        and is_active = true
        and role in ('employee', 'editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
    )
  );

drop policy if exists "billing_document_items_own_draft" on billing_document_items;
create policy "billing_document_items_own_draft" on billing_document_items
  for all using (
    exists (
      select 1 from billing_documents d
      join profiles p on p.id = auth.uid()
      where d.id = document_id
        and d.created_by = auth.uid()
        and d.status = 'draft'
        and p.is_active = true
        and p.role in ('employee', 'editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
    )
  ) with check (
    exists (
      select 1 from billing_documents d
      join profiles p on p.id = auth.uid()
      where d.id = document_id
        and d.created_by = auth.uid()
        and d.status = 'draft'
        and p.is_active = true
        and p.role in ('employee', 'editor', 'junior_partner', 'admin', 'senior_partner', 'super_admin')
    )
  );