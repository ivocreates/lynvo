-- LYNVO public site phase 1: richer enquiries, careers, and FAQs.

-- ---------------------------------------------------------------------------
-- 1. Contacts: capture qualification details from the public form
-- ---------------------------------------------------------------------------

alter table contacts add column if not exists company text;
alter table contacts add column if not exists phone text;
alter table contacts add column if not exists service text;
alter table contacts add column if not exists budget text;
alter table contacts add column if not exists timeline text;
-- 'project' | 'quote' | 'careers' | 'general'
alter table contacts add column if not exists enquiry_type text not null default 'project';

-- Re-assert the anonymous insert policy with bounds on the new columns so the
-- public form cannot be used to smuggle in oversized payloads.
drop policy if exists "contacts_insert_public" on contacts;
create policy "contacts_insert_public" on contacts
  for insert
  with check (
    status = 'new'
    and length(name) between 2 and 120
    and length(message) between 10 and 4000
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and enquiry_type in ('project', 'quote', 'careers', 'general')
    and (company is null or length(company) <= 160)
    and (phone is null or length(phone) <= 40)
    and (service is null or length(service) <= 160)
    and (budget is null or length(budget) <= 80)
    and (timeline is null or length(timeline) <= 80)
  );

-- ---------------------------------------------------------------------------
-- 2. Careers
-- ---------------------------------------------------------------------------

create table if not exists job_openings (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  -- 'full-time' | 'part-time' | 'internship' | 'freelance'
  employment_type text not null default 'internship',
  department text,
  location text default 'Remote',
  excerpt text,
  description text,
  responsibilities text[] default '{}',
  requirements text[] default '{}',
  is_open boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists job_openings_slug_idx on job_openings (lower(slug));

-- ---------------------------------------------------------------------------
-- 3. FAQs
-- ---------------------------------------------------------------------------

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  -- Groups FAQs per page, e.g. 'contact' or 'services'.
  category text not null default 'contact',
  active boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists faqs_category_idx on faqs (category, "order") where active = true;

-- ---------------------------------------------------------------------------
-- 4. RLS: anonymous read of live rows, staff write
-- ---------------------------------------------------------------------------

alter table job_openings enable row level security;
alter table faqs enable row level security;

drop policy if exists "job_openings_public_read" on job_openings;
create policy "job_openings_public_read" on job_openings
  for select using (is_open = true);

drop policy if exists "job_openings_staff_write" on job_openings;
create policy "job_openings_staff_write" on job_openings
  for all using (is_staff()) with check (is_staff());

drop policy if exists "faqs_public_read" on faqs;
create policy "faqs_public_read" on faqs
  for select using (active = true);

drop policy if exists "faqs_staff_write" on faqs;
create policy "faqs_staff_write" on faqs
  for all using (is_staff()) with check (is_staff());

grant select on job_openings to anon, authenticated;
grant select on faqs to anon, authenticated;
grant all on job_openings to authenticated;
grant all on faqs to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Seed content
-- ---------------------------------------------------------------------------

insert into faqs (question, answer, category, "order") values
  ('What''s your typical project timeline?', 'Landing pages ship in 1–2 weeks. Marketing sites usually run 3–5 weeks. Product-grade applications are scoped per milestone, typically 6–12 weeks. You get a dated roadmap before any code is written.', 'contact', 1),
  ('Do you work with international clients?', 'Yes. We are based in Sawantwadi, India and work with clients across time zones. Async updates, recorded walkthroughs, and overlapping call windows keep the loop tight.', 'contact', 2),
  ('How does pricing work?', 'Fixed-scope projects are quoted upfront from a written brief. Ongoing work runs on a monthly retainer. Either way you get an itemised quote before we start — no hourly surprises.', 'contact', 3),
  ('Do you offer ongoing support after launch?', 'Yes. Every project includes 30 days of post-launch support. After that you can move to a maintenance retainer covering monitoring, patches, and iterative improvements.', 'contact', 4),
  ('What information do you need to get started?', 'Your goal, your audience, any existing brand or design assets, a rough budget band, and your target launch date. If you only have half of that, start the conversation anyway — shaping the brief is part of the work.', 'contact', 5)
on conflict do nothing;

insert into job_openings (slug, title, employment_type, department, location, excerpt, description, responsibilities, requirements, "order") values
  (
    'frontend-developer-intern',
    'Frontend Developer Intern',
    'internship',
    'Engineering',
    'Remote / Sawantwadi',
    'Build production React and Next.js interfaces alongside the studio team.',
    'You will work on real client interfaces from day one — component work, responsive layouts, and performance passes — with review and mentoring on every pull request.',
    array['Build responsive UI components in React and Next.js', 'Translate Figma designs into accessible markup', 'Fix bugs and improve page performance', 'Participate in weekly review sessions'],
    array['Comfortable with JavaScript, React, and CSS', 'Familiarity with Git', 'Careful eye for spacing, type, and detail', 'Available at least 20 hours a week'],
    1
  ),
  (
    'graphic-designer',
    'Graphic Designer',
    'part-time',
    'Design',
    'Remote',
    'Shape brand identities, social assets, and marketing collateral for Lynvo clients.',
    'You will own visual output across brand systems and campaign work, partnering directly with the founder on direction and with developers on handoff.',
    array['Design brand identities, logos, and guideline documents', 'Produce social and marketing collateral', 'Maintain and extend design systems', 'Prepare clean handoff files for developers'],
    array['Strong portfolio of brand or campaign work', 'Fluent in Figma and the Adobe suite', 'Understanding of type, grid, and colour systems', 'Able to take and apply direction quickly'],
    2
  ),
  (
    'cybersecurity-intern',
    'Cybersecurity Intern',
    'internship',
    'Security',
    'Remote',
    'Assist on VAPT engagements and web application security reviews.',
    'You will shadow and then run parts of our security assessments — reconnaissance, OWASP Top 10 testing, and report writing — under supervision.',
    array['Assist on web application penetration tests', 'Document findings with clear reproduction steps', 'Track remediation with the engineering team', 'Keep testing checklists current'],
    array['Working knowledge of the OWASP Top 10', 'Hands-on with Burp Suite or similar', 'Clear written English for reporting', 'Strong sense of professional ethics'],
    3
  )
on conflict do nothing;
