-- Move HR document formatting onto the HR document page and support two designated partners.

insert into site_settings (key, value) values
  ('doc_signature_url', jsonb_build_object('text', '')),
  ('doc_second_signature_url', jsonb_build_object('text', '')),
  ('doc_second_signatory_name', jsonb_build_object('text', '')),
  ('doc_second_signatory_title', jsonb_build_object('text', 'Co-Founder & Designated Partner')),
  ('doc_stamp_url', jsonb_build_object('text', ''))
on conflict (key) do nothing;

update site_settings
set value = jsonb_build_object('text', 'Founder & Designated Partner')
where key in ('doc_signatory_title', 'certificate_partner_title')
  and coalesce(value->>'text', '') = '';

update site_settings
set value = jsonb_build_object('text', 'Co-Founder & Designated Partner')
where key = 'certificate_second_partner_title'
  and coalesce(value->>'text', '') = '';