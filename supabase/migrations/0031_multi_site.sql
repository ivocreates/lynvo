-- LYNVO platform, phase 12: one CMS, two public sites.
--
--   lynvo.studio  launch your venture online: websites, brand identity,
--                 online presence, growth with new technology and AI
--   lynvo.tech    custom software for small businesses and cybersecurity
--
-- Content rows say which site shows them: 'studio', 'tech' or 'both'.

do $$
declare
  t text;
begin
  foreach t in array array['services', 'projects', 'blog_posts', 'faqs'] loop
    execute format('alter table %I add column if not exists site text not null default ''studio''', t);
    execute format('alter table %I drop constraint if exists %I', t, t || '_site_check');
    execute format('alter table %I add constraint %I check (site in (''studio'', ''tech'', ''both''))', t, t || '_site_check');
    execute format('create index if not exists %I on %I (site)', t || '_site_idx', t);
  end loop;
end;
$$;

-- Website enquiries remember which site they came from.
alter table contacts add column if not exists site text not null default 'studio';
alter table contacts drop constraint if exists contacts_site_check;
alter table contacts add constraint contacts_site_check check (site in ('studio', 'tech'));

-- Existing services: software and security are mentioned on the studio site but
-- belong to LYNVO Tech; app and Web3 work moves there entirely.
update services set site = 'both' where slug in ('custom-software', 'vapt-security-audits') and site = 'studio';
update services set site = 'tech' where slug in ('app-development', 'web3-blockchain') and site = 'studio';
update projects set site = 'both' where slug in ('saas-product-dashboard') and site = 'studio';
update projects set site = 'tech' where slug in ('nft-marketplace-dapp') and site = 'studio';

-- lynvo.tech services
insert into services (slug, title, excerpt, content, tags, active, featured, "order", site) values
  ('business-software', 'Custom Business Software',
   'Billing, inventory, bookings, CRM and staff tools built around how your business already works.',
   '{"intro":"Off-the-shelf software makes you change how you work. We build software that fits your business instead — and you own it.","process":["Map your current process and the bottlenecks","Agree a focused first version with a fixed price","Build in weekly increments you can try","Launch, train your team and keep improving"],"deliverables":["Web dashboard for your team","Role-based access for staff and managers","Reports and exports","Training and documentation"],"outcomes":["Less time on spreadsheets and WhatsApp","Fewer mistakes in billing and stock","Clear numbers for decisions"]}',
   '{"Business software",Dashboards,Automation}', true, true, 101, 'tech'),
  ('web-applications', 'Web Applications & Portals',
   'Customer portals, SaaS products and internal platforms with secure logins and payments.',
   '{"intro":"From a client portal to a full SaaS product, we design the architecture, build it and run it.","deliverables":["Authentication and roles","Payments and subscriptions","Admin dashboard","API and integrations","Hosting and monitoring"],"stack":["Next.js","TypeScript","Postgres","Supabase","Cloudflare"]}',
   '{SaaS,Portals,"Next.js"}', true, true, 102, 'tech'),
  ('ai-automation', 'AI & Workflow Automation',
   'Chat assistants, document processing and automations that take repetitive work off your team.',
   '{"intro":"Practical AI for small businesses: answer customer questions, read invoices, draft replies and connect your tools.","deliverables":["AI chat assistant trained on your content","Document and invoice extraction","WhatsApp and email automations","Integration with your existing tools"],"outcomes":["Faster replies to customers","Hours saved every week","Consistent, documented processes"]}',
   '{AI,Automation,Chatbots}', true, true, 103, 'tech'),
  ('integrations-apis', 'Integrations & APIs',
   'Connect payment gateways, accounting, shipping, CRM and ERP systems so data flows automatically.',
   '{"deliverables":["Payment gateway integration (Razorpay, Stripe, PhonePe)","Accounting and GST tools","Shipping and logistics APIs","Custom REST APIs and webhooks"]}',
   '{APIs,Integrations,Payments}', true, false, 104, 'tech'),
  ('managed-security', 'Security Hardening & Monitoring',
   'Ongoing protection for your website and apps: hardening, backups, monitoring and incident response.',
   '{"intro":"Most small-business breaches come from outdated software, weak passwords and missing backups. We fix the basics and keep watch.","process":["Baseline security review","Fix critical issues and harden configuration","Set up monitoring, backups and alerts","Monthly report and patching"],"deliverables":["Security hardening","Automated backups","Uptime and threat monitoring","Incident response support"]}',
   '{Security,Monitoring,Backups}', true, true, 105, 'tech')
on conflict ((lower(slug))) do update set site = excluded.site;

-- lynvo.tech copy, editable at /admin/sites
insert into site_settings (key, value) values
  ('tech_hero_kicker', jsonb_build_object('text', 'LYNVO TECH / SOFTWARE & SECURITY FOR SMALL BUSINESSES')),
  ('tech_hero_headline', jsonb_build_object('text', 'Custom software that fits your business. Security that keeps it safe.')),
  ('tech_hero_description', jsonb_build_object('text', 'We build billing, inventory, booking and staff tools around the way you already work, automate the repetitive parts with AI, and test and harden your systems before attackers find the gaps.')),
  ('tech_primary_cta', jsonb_build_object('text', 'Book a free consultation')),
  ('tech_contact_email', jsonb_build_object('text', '')),
  ('tech_tagline', jsonb_build_object('text', 'Software & security for small businesses.')),
  ('studio_tech_teaser', jsonb_build_object('text', 'Need custom software, an app or a security check? That is LYNVO Tech.'))
on conflict (key) do nothing;

-- lynvo.studio copy: only replaced where it still holds the original seed text.
update site_settings set value = jsonb_build_object('text', 'LYNVO STUDIO / LAUNCH YOUR NEXT VENTURE ONLINE')
 where key = 'hero_kicker' and coalesce(value ->> 'text', '') in ('', 'Now booking Q4 projects');
update site_settings set value = jsonb_build_object('text', 'Launch your next venture online — and keep it growing.')
 where key = 'hero_headline' and coalesce(value ->> 'text', '') in ('', 'We turn bold ideas into digital momentum. Built to scale.');
update site_settings set value = jsonb_build_object('text', 'Websites, brand identities and a complete online presence for businesses ready to be found. We bring you online, then help you grow with smarter technology and AI.')
 where key = 'hero_description'
   and coalesce(value ->> 'text', '') in ('', 'From launch-ready websites to product-grade applications, we blend design strategy, engineering discipline, and business context so every release moves your brand forward.');
