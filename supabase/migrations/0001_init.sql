-- LYNVO initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

create type app_role as enum ('super_admin', 'admin', 'editor');
create type content_status as enum ('draft', 'published');
create type review_status as enum ('pending', 'approved', 'rejected');
create type contact_status as enum ('new', 'read', 'replied', 'archived');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role app_role not null default 'editor',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, is_active)
  values (new.id, new.email, new.email, 'editor', false);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------

create table site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table seo_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  content jsonb default '{}'::jsonb,
  tags text[] default '{}',
  active boolean not null default true,
  featured boolean not null default false,
  "order" int not null default 0,
  seo_title text,
  seo_description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index services_slug_idx on services (lower(slug));

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  content jsonb default '{}'::jsonb,
  status content_status not null default 'draft',
  category text,
  industry text,
  tags text[] default '{}',
  featured boolean not null default false,
  image_url text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index projects_slug_idx on projects (lower(slug));
create index projects_published_idx on projects (created_at desc) where status = 'published';

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text,
  content text,
  status content_status not null default 'draft',
  author_id uuid references profiles (id),
  tags text[] default '{}',
  cover_image_url text,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index blog_posts_slug_idx on blog_posts (lower(slug));
create index blog_posts_published_idx on blog_posts (published_at desc) where status = 'published';

create table team_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role text,
  bio text,
  skills text[] default '{}',
  social_links jsonb default '{}'::jsonb,
  image_url text,
  is_active boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text,
  content text not null,
  rating int check (rating between 1 and 5),
  status review_status not null default 'pending',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  suffix text,
  "order" int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  "order" int not null default 0,
  active boolean not null default true
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status contact_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_status_idx on contacts (status, created_at desc);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);
create unique index newsletter_subscribers_email_idx on newsletter_subscribers (lower(email));

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  alt_text text,
  mime_type text,
  width int,
  height int,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table site_settings enable row level security;
alter table seo_settings enable row level security;
alter table services enable row level security;
alter table projects enable row level security;
alter table blog_posts enable row level security;
alter table team_members enable row level security;
alter table reviews enable row level security;
alter table stats enable row level security;
alter table social_links enable row level security;
alter table contacts enable row level security;
alter table newsletter_subscribers enable row level security;
alter table media_assets enable row level security;
alter table audit_logs enable row level security;

-- profiles: users read their own row; staff (admin/super_admin) manage roles
create policy "profiles_select_own" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_admin_manage" on profiles for all using (is_admin()) with check (is_admin());

-- public read for published/active content
create policy "services_public_read" on services for select using (active = true);
create policy "services_staff_write" on services for all using (is_staff()) with check (is_staff());

create policy "projects_public_read" on projects for select using (status = 'published');
create policy "projects_staff_write" on projects for all using (is_staff()) with check (is_staff());

create policy "blog_posts_public_read" on blog_posts for select using (status = 'published' and published_at <= now());
create policy "blog_posts_staff_write" on blog_posts for all using (is_staff()) with check (is_staff());

create policy "team_members_public_read" on team_members for select using (is_active = true);
create policy "team_members_staff_write" on team_members for all using (is_staff()) with check (is_staff());

create policy "reviews_public_read" on reviews for select using (status = 'approved');
create policy "reviews_staff_write" on reviews for all using (is_staff()) with check (is_staff());

create policy "stats_public_read" on stats for select using (active = true);
create policy "stats_staff_write" on stats for all using (is_staff()) with check (is_staff());

create policy "social_links_public_read" on social_links for select using (active = true);
create policy "social_links_staff_write" on social_links for all using (is_staff()) with check (is_staff());

create policy "site_settings_public_read" on site_settings for select using (true);
create policy "site_settings_staff_write" on site_settings for all using (is_staff()) with check (is_staff());

create policy "seo_settings_public_read" on seo_settings for select using (true);
create policy "seo_settings_staff_write" on seo_settings for all using (is_staff()) with check (is_staff());

-- staff-only resources
create policy "contacts_insert_public" on contacts for insert with check (true);
create policy "contacts_staff_manage" on contacts for select using (is_staff());
create policy "contacts_staff_update" on contacts for update using (is_staff()) with check (is_staff());

create policy "newsletter_insert_public" on newsletter_subscribers for insert with check (true);
create policy "newsletter_staff_read" on newsletter_subscribers for select using (is_staff());

create policy "media_assets_public_read" on media_assets for select using (bucket = 'public-media');
create policy "media_assets_staff_manage" on media_assets for all using (is_staff()) with check (is_staff());

create policy "audit_logs_staff_read" on audit_logs for select using (is_staff());
create policy "audit_logs_staff_insert" on audit_logs for insert with check (is_staff());
