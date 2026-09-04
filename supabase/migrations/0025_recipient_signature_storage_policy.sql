-- Recipient signature uploads must work for every active team member (including
-- interns/employees), not just is_staff() (editor+). Scope the insert to the
-- recipient's own folder so nobody can write into someone else's signature path.

drop policy if exists "public_media_recipient_signature_write" on storage.objects;
create policy "public_media_recipient_signature_write" on storage.objects
  for insert with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = 'recipient-signatures'
    and (storage.foldername(name))[2] = auth.uid()::text
    and is_team_member()
  );
