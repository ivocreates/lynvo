-- HR documents can require a recipient signature before they become downloadable.

alter table staff_documents
  add column if not exists signature_required boolean not null default false,
  add column if not exists recipient_signature_url text,
  add column if not exists recipient_signed_at timestamptz;

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
    new.signature_required := old.signature_required;
    new.recipient_signature_url := new.recipient_signature_url;
    new.recipient_signed_at := new.recipient_signed_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;