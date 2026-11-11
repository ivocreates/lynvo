-- Enum values used by the billing workflow (0028), legal templates (0029) and
-- CRM (0030). Postgres refuses to use a new enum value inside the transaction
-- that adds it, so this migration only widens the types.

alter type billing_doc_status add value if not exists 'partially_paid' after 'accepted';

alter type staff_doc_type add value if not exists 'appointment';
alter type staff_doc_type add value if not exists 'payslip';
alter type staff_doc_type add value if not exists 'certificate';
alter type staff_doc_type add value if not exists 'recommendation';
alter type staff_doc_type add value if not exists 'relieving';
