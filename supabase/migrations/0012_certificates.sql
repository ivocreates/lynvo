-- LYNVO team platform, phase 5: publicly verifiable certificates.
--
-- Recipient details are denormalised on purpose: a certificate must stay
-- verifiable and readable even after the person's account is removed.

create type certificate_type as enum ('internship', 'experience', 'completion', 'appreciation');
create type certificate_status as enum ('draft', 'issued', 'revoked');

-- Verification codes are read aloud and typed by hand, so avoid ambiguous
-- characters and keep them short.
create or replace function public.generate_certificate_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt int := 0;
begin
  loop
    candidate := 'LYNVO-' || to_char(now(), 'YYYY') || '-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from certificates where code = candidate);

    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'Could not allocate a unique certificate code';
    end if;
  end loop;

  return candidate;
end;
$$;

create table certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  cert_type certificate_type not null default 'internship',
  status certificate_status not null default 'draft',

  recipient_id uuid references profiles (id) on delete set null,
  recipient_name text not null,
  recipient_email text,
  role_title text,
  department text,

  start_date date,
  end_date date,
  summary text,
  skills text[] default '{}',

  issued_on date,
  issued_by uuid references profiles (id) on delete set null,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table certificates alter column code set default public.generate_certificate_code();
create unique index certificates_code_idx on certificates (code);
create index certificates_recipient_idx on certificates (recipient_id, status);

-- ---------------------------------------------------------------------------
-- RLS: no anonymous table access at all. Public verification goes through the
-- function below, which exposes only the fields printed on the certificate.
-- ---------------------------------------------------------------------------

alter table certificates enable row level security;

create policy "certificates_manager_manage" on certificates
  for all using (is_manager()) with check (is_manager());

create policy "certificates_recipient_read" on certificates
  for select using (recipient_id = auth.uid() and status = 'issued');

grant select, insert, update, delete on certificates to authenticated;

-- ---------------------------------------------------------------------------
-- Public verification
-- ---------------------------------------------------------------------------

create or replace function public.verify_certificate(p_code text)
returns table (
  code text,
  cert_type certificate_type,
  status certificate_status,
  recipient_name text,
  role_title text,
  department text,
  start_date date,
  end_date date,
  summary text,
  skills text[],
  issued_on date
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.code, c.cert_type, c.status, c.recipient_name, c.role_title, c.department,
    c.start_date, c.end_date, c.summary, c.skills, c.issued_on
  from certificates c
  -- Revoked certificates resolve too, so verification can say so explicitly.
  where upper(trim(c.code)) = upper(trim(p_code))
    and c.status in ('issued', 'revoked')
  limit 1;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

insert into site_settings (key, value) values
  ('certificate_intro', jsonb_build_object('text', 'This is to certify that')),
  ('certificate_note', jsonb_build_object('text', 'Verify this certificate at the address below or by scanning the QR code.'))
on conflict (key) do nothing;
