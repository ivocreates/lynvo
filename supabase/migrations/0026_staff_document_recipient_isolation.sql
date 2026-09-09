-- Individually addressed documents are private even when an audience was
-- selected during authoring. Group audience rules apply only to unaddressed
-- company documents.

drop policy if exists "staff_documents_read" on staff_documents;

create policy "staff_documents_read" on staff_documents
  for select using (
    is_manager()
    or (
      status = 'issued'
      and (
        recipient_id = auth.uid()
        or (
          recipient_id is null
          and (
            (audience = 'team' and is_team_member())
            or (audience = 'employees' and my_role() in ('employee', 'editor', 'junior_partner'))
            or (audience = 'interns' and my_role() = 'intern')
          )
        )
      )
    )
  );