-- Employee profiles on the public team page.
--
-- Everyone on the team keeps a photo (avatar_url), bio and skills on their
-- profile. An admin decides who is shown on lynvo.studio/team
-- (show_on_website) and in what order (website_order). public_title
-- overrides the internal job title on the website; social_links holds
-- {"linkedin": "https://...", "github": "...", "website": "..."}.

alter table profiles add column show_on_website integer not null default 0;
alter table profiles add column website_order integer not null default 0;
alter table profiles add column public_title text;
alter table profiles add column social_links text not null default '{}';
