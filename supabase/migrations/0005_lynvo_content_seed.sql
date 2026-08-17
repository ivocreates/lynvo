-- Seed the public content represented by lynvo.tech into the existing CMS tables.
-- Editors can refine any of these records from /admin after applying the migration.

insert into site_settings (key, value) values
  ('site_name', '{"text":"LYNVO"}'),
  ('tagline', '{"text":"Linking Ideas to Innovation"}'),
  ('contact_email', '{"text":"contact@lynvo.tech"}'),
  ('address', '{"text":"Sawantwadi, Maharashtra, India - Available for global projects"}'),
  ('footer_note', '{"text":"LYNVO STUDIO OS - v2.0 - Build 2026"}'),
  ('default_seo_title', '{"text":"LYNVO - Linking Ideas to Innovation"}'),
  ('default_seo_description', '{"text":"Lynvo is a digital studio that builds, redesigns, troubleshoots, and ships websites, brands, software, and growth systems."}')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into social_links (platform, url, "order") values
  ('github', 'https://github.com/ivocreates', 1),
  ('linkedin', 'https://www.linkedin.com/in/ivopereira/', 2),
  ('instagram', 'https://www.instagram.com/lynvo.tech/', 3),
  ('x', 'https://x.com/lynvo_tech', 4);

insert into stats (label, value, suffix, "order") values
  ('Happy clients', '30', '+', 1),
  ('Countries served', '5', '+', 2),
  ('Years active', '3', '+', 3),
  ('Projects shipped', '50', '+', 4);

insert into services (slug, title, excerpt, content, tags, active, featured, "order") values
  ('web-development', 'Web Development', 'React, Next.js, Node.js, and Laravel builds from landing pages to complex platforms.', '{"process":["Clarify the product and its users","Design the experience and technical shape","Build, test, and launch","Measure performance and keep improving"],"deliverables":["Responsive web applications","CMS and API integrations","Performance and accessibility foundations"]}', '{React,Next.js,Firebase}', true, true, 1),
  ('ui-ux-brand-design', 'UI/UX and Brand Design', 'Brand systems and user interfaces that convert, from wireframes to pixel-perfect implementations.', '{"process":["Research the audience and opportunity","Map the experience","Create and test the visual system"],"deliverables":["Wireframes and prototypes","Design systems","Production-ready UI"]}', '{Figma,"Brand Design",Systems}', true, true, 2),
  ('brand-identity-graphics', 'Brand Identity and Graphics', 'Logos, visual identity systems, and graphic design that make your brand unforgettable.', '{"deliverables":["Logo direction","Identity system","Print and digital assets"]}', '{"Logo Design",Identity,"Print and Digital"}', true, true, 3),
  ('social-media-management', 'Social Media Management', 'Grow your audience with strategic content, consistent posting, and community management.', '{"deliverables":["Content strategy","Consistent publishing","Community engagement"]}', '{"Content Strategy",Growth,Engagement}', true, false, 4),
  ('seo-geo-optimization', 'SEO and Geo Optimization', 'Technical SEO and geo-targeted strategies to make your business discoverable.', '{"deliverables":["Technical SEO","Local SEO","Search-led content"]}', '{"Technical SEO","Local SEO",Content}', true, true, 5),
  ('vapt-security-audits', 'VAPT and Security Audits', 'Vulnerability Assessment and Penetration Testing to find weaknesses before attackers do.', '{"deliverables":["OWASP-informed review","Penetration testing","Actionable remediation report"]}', '{OWASP,"Pen Test",Security}', true, true, 6),
  ('app-development', 'App Development', 'Mobile and progressive web apps built with modern frameworks.', '{"deliverables":["React Native apps","Flutter apps","Progressive web apps"]}', '{"React Native",Flutter,PWA}', true, false, 7),
  ('web3-blockchain', 'Web3 and Blockchain', 'Smart contracts, DApps, NFT platforms, DeFi integrations, built securely.', '{"deliverables":["Solidity contracts","DApp interfaces","Web3 integrations"]}', '{Solidity,Ethereum,DeFi}', true, true, 8),
  ('custom-software', 'Custom Software', 'Bespoke desktop apps, internal tools, and automation scripts for your workflow.', '{"deliverables":["Internal tools","Automation scripts","API integrations"]}', '{Python,Electron,APIs}', true, false, 9),
  ('digital-strategy', 'Digital Strategy', 'End-to-end digital roadmaps for businesses ready to scale.', '{"deliverables":["Digital roadmap","Go-to-market plan","Product direction"]}', '{Roadmap,GTM,Product}', true, true, 10);

insert into projects (slug, title, excerpt, content, status, category, industry, tags, featured) values
  ('saas-product-dashboard', 'SaaS Product Dashboard', 'A focused product dashboard that delivered a 34% conversion increase.', '{"challenge":"Turn a complex B2B SaaS workflow into a clearer product experience.","outcome":"34% conversion increase.","stack":["React","Firebase","Tailwind"]}', 'published', 'Web Development', 'B2B SaaS', '{React,Firebase,Tailwind}', true),
  ('nft-marketplace-dapp', 'NFT Marketplace DApp', 'A Web3 marketplace live on mainnet.', '{"challenge":"Create a trustworthy, usable interface for a new on-chain marketplace.","outcome":"Live on Mainnet.","stack":["Solidity","Ethers.js","IPFS"]}', 'published', 'Web3 / Blockchain', 'Web3', '{Solidity,"Ethers.js",IPFS}', true),
  ('e-commerce-platform', 'E-Commerce Platform', 'A commerce platform that processed more than 1M in revenue.', '{"challenge":"Build a fast, reliable buying experience with a flexible content layer.","outcome":"1M+ revenue processed.","stack":["Next.js","Stripe","Postgres"]}', 'published', 'Web Development', 'E-Commerce', '{Next.js,Stripe,Postgres}', true),
  ('fintech-startup-branding', 'Fintech Startup Branding', 'A complete identity for a fintech startup.', '{"challenge":"Give a new fintech product a clear and credible point of view.","outcome":"Complete identity system.","stack":["Logo Design","Brand System"]}', 'published', 'Brand Identity', 'Fintech', '{"Logo Design","Brand System"}', true);

insert into team_members (display_name, role, bio, skills, social_links, is_active, "order") values
  ('Ivo Pereira', 'Founder and CEO', 'Full-Stack Developer, Cybersecurity Analyst, and Web3 Engineer from Sawantwadi, India. Google Cloud Innovator, Cisco CCST Certified, and active in global developer and infosec communities.', '{"React and Next.js",Node.js,Python,Firebase,"Solidity / Web3",Cybersecurity,"UI/UX Design"}', '{"linkedin":"https://www.linkedin.com/in/ivopereira/","github":"https://github.com/ivocreates"}', true, 1);

insert into reviews (author_name, content, status, featured) values
  ('LYNVO', 'A digital partner that actually delivers.', 'approved', true);
