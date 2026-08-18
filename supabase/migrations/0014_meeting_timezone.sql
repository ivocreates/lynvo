-- Meeting times are wall-clock times in a specific place, not server time.
-- Cloudflare Workers run in UTC, so "Monday 10:00" was drifting for everyone.

alter table meetings add column if not exists timezone text not null default 'Asia/Kolkata';
