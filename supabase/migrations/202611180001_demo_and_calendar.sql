-- The public demo and the olympiad calendar.

-- One row per demo check, keyed by a hash of the visitor's address, to hold
-- the limits; rows older than two days are removed by the app. No answers,
-- names or addresses are kept.
create table if not exists public.demo_checks (
  id bigint generated always as identity primary key,
  address text not null,
  created_at timestamptz not null default now()
);
create index if not exists demo_checks_recent_idx on public.demo_checks (created_at desc, address);
alter table public.demo_checks enable row level security;
revoke all on public.demo_checks from anon, authenticated;
grant all on public.demo_checks to service_role;

-- When an olympiad is usually held, for the calendar when no exact date is
-- set yet. Shown as "usually in <month>", never as a date: exact dates are
-- entered by an admin (starts_on) and always take precedence.
alter table public.competitions add column if not exists typical_month smallint check (typical_month between 1 and 12);

update public.competitions set typical_month = v.month
from (values
  ('imo', 7), ('ipho', 7), ('eupho', 7), ('tuymaada', 7),
  ('apho', 5), ('bmo', 5), ('jbmo', 6),
  ('apmo', 3), ('usamo', 3), ('egmo', 4), ('nbpho', 4),
  ('west-china', 8),
  ('izho', 1), ('izho-physics', 1),
  ('kz-district-math', 12), ('kz-district-physics', 12),
  ('kz-regional-math', 1), ('kz-regional-physics', 1),
  ('kz-national-math', 3), ('kz-national-physics', 3)
) as v(slug, month)
where public.competitions.slug = v.slug and public.competitions.typical_month is null;
