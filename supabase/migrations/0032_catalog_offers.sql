-- LYNVO billing, phase 13: offers & discounts, package savings, and a
-- consistent India / international price ladder.

-- ---------------------------------------------------------------------------
-- 1. Offers (promo codes and seasonal discounts)
-- ---------------------------------------------------------------------------

create table if not exists billing_offers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text,
  kind text not null default 'percent',
  value numeric(14, 2) not null default 0,
  -- Empty = the whole one-time subtotal; otherwise only lines in these categories.
  categories text[] not null default '{}',
  min_subtotal numeric(14, 2) not null default 0,
  region text not null default 'all',
  valid_from date,
  valid_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_offers_kind_check check (kind in ('percent', 'flat')),
  constraint billing_offers_region_check check (region in ('all', 'IN', 'INT')),
  constraint billing_offers_value_check check (value >= 0)
);
create unique index if not exists billing_offers_code_idx on billing_offers (upper(code));

alter table billing_offers enable row level security;

drop policy if exists "billing_offers_manage" on billing_offers;
create policy "billing_offers_manage" on billing_offers
  for all using (has_permission('billing.manage')) with check (has_permission('billing.manage'));
drop policy if exists "billing_offers_team_read" on billing_offers;
create policy "billing_offers_team_read" on billing_offers
  for select using (is_team_member());

grant select, insert, update, delete on billing_offers to authenticated;

insert into billing_offers (code, title, description, kind, value, categories, min_subtotal, region) values
  ('LAUNCH10', 'Launch offer', '10% off any new website or brand project.', 'percent', 10, '{}', 10000, 'all'),
  ('BRAND15', 'Brand bundle', '15% off when ordering 3 or more brand identity / stationery items.', 'percent', 15, '{"Brand Identity","Stationery","Graphic Design"}', 5000, 'all'),
  ('STARTUP20', 'Startup & student', '20% off for registered startups, students and non-profits.', 'percent', 20, '{}', 0, 'IN'),
  ('REFER2000', 'Referral reward', '₹2,000 off for clients referred by an existing client.', 'flat', 2000, '{}', 15000, 'IN'),
  ('ANNUAL2M', 'Pay yearly', 'Two months free on maintenance and retainers billed yearly.', 'percent', 16.67, '{"Maintenance","Infrastructure","SEO","GEO / Local SEO"}', 0, 'all')
on conflict ((upper(code))) do nothing;

-- Documents remember which discount was applied so the PDF can say so.
alter table billing_documents
  add column if not exists discount_percent numeric(5, 2),
  add column if not exists offer_code text;

-- ---------------------------------------------------------------------------
-- 2. Package savings ("worth ₹X, you save Y%")
-- ---------------------------------------------------------------------------

alter table billing_packages
  add column if not exists compare_inr numeric(14, 2),
  add column if not exists compare_intl numeric(14, 2);

-- Brand packages priced below the sum of their parts.
update billing_packages set price_inr = 7999, price_intl = 269, compare_inr = 10250, compare_intl = 349 where code = 'pkg-brand-starter';
update billing_packages set price_inr = 14999, price_intl = 499, compare_inr = 17500, compare_intl = 599 where code = 'pkg-brand-identity';
update billing_packages set price_inr = 34999, price_intl = 1199, compare_inr = 46000, compare_intl = 1549 where code = 'pkg-brand-pro';
update billing_packages set price_inr = 18999, price_intl = 649, compare_inr = 22748, compare_intl = 769 where code = 'pkg-launch-bundle';
update billing_packages set compare_inr = 6000, compare_intl = 199 where code = 'pkg-social-design';

-- ---------------------------------------------------------------------------
-- 3. Tidy categories
-- ---------------------------------------------------------------------------

update billing_items set category = 'Brand Identity' where category = 'Branding';

-- ---------------------------------------------------------------------------
-- 4. International ladder
-- ---------------------------------------------------------------------------
-- India prices are unchanged. International (USD) prices follow one rule:
-- INR / 30, rounded to a friendly price point. Anything priced by hand at
-- 15%+ away from the rule is assumed deliberate and left alone.

create or replace function public.friendly_usd(inr numeric)
returns numeric
language sql
immutable
as $$
  select case
    when inr / 30 < 1 then round(inr / 30, 2)
    when inr / 30 < 15 then round(inr / 30)
    when inr / 30 < 100 then round(inr / 30 / 5) * 5
    when inr / 30 < 1000 then round(inr / 30 / 10) * 10 - 1
    else round(inr / 30 / 50) * 50 - 1
  end;
$$;

update billing_items
   set unit_price_intl = public.friendly_usd(unit_price), updated_at = now()
 where unit_price > 0
   and abs(unit_price_intl - unit_price / 30) <= 0.15 * (unit_price / 30)
   and unit_price_intl <> public.friendly_usd(unit_price);
