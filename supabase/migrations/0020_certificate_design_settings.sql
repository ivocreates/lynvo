-- Certificate design controls shown in billing/settings.

insert into site_settings (key, value) values
  ('certificate_layout', jsonb_build_object('text', 'classic')),
  ('certificate_body_template', jsonb_build_object('text', 'has successfully completed an engagement as {{role_title}} at {{brand}}{{period}}.')),
  ('certificate_content_stamp', jsonb_build_object('text', 'VERIFIED')),
  ('certificate_stamp_url', jsonb_build_object('text', '')),
  ('certificate_signature_url', jsonb_build_object('text', '')),
  ('certificate_partner_name', jsonb_build_object('text', '')),
  ('certificate_partner_title', jsonb_build_object('text', '')),
  ('certificate_second_signature_url', jsonb_build_object('text', '')),
  ('certificate_second_partner_name', jsonb_build_object('text', '')),
  ('certificate_second_partner_title', jsonb_build_object('text', ''))
on conflict (key) do nothing;