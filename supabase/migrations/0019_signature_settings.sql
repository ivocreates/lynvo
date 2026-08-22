-- LYNVO phase 9: signature/stamp assets and per-document header notes.

insert into site_settings (key, value) values
  ('billing_signature_url', jsonb_build_object('text', '')),
  ('billing_stamp_url', jsonb_build_object('text', '')),
  ('billing_quote_header_note', jsonb_build_object('text', '')),
  ('billing_invoice_header_note', jsonb_build_object('text', '')),
  ('doc_header_note', jsonb_build_object('text', ''))
on conflict (key) do nothing;
