-- Deliverable files and release rules.
--
-- A deliverable can carry a private file (stored in R2 under private/) and/or
-- a link. Clients can download it once it is released:
--   immediate       straight away
--   after_invoice   when the linked invoice is paid in full
--   after_all_paid  when the client has no outstanding balance (and at least one paid invoice)
--   manual          only after an admin presses "Release"
-- An admin can release any deliverable early (released_at).

alter table client_deliverables add column file_key text;
alter table client_deliverables add column file_name text;
alter table client_deliverables add column file_size integer;
alter table client_deliverables add column file_type text;
alter table client_deliverables add column release_rule text not null default 'immediate'
  check (release_rule in ('immediate', 'after_invoice', 'after_all_paid', 'manual'));
alter table client_deliverables add column invoice_id text references billing_documents (id) on delete set null;
alter table client_deliverables add column released_at text;
alter table client_deliverables add column download_count integer not null default 0;
alter table client_deliverables add column last_downloaded_at text;
