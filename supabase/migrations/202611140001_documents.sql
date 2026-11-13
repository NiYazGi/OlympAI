-- Documents issued from the admin document generator.
--
-- Each issued document keeps the exact fields it was printed with, so it can
-- be reopened and printed again identically, and an outgoing number that is
-- unique per kind and year (e.g. OF-2026/007). Only the server writes or reads
-- it: the generator is for administrators, never for the browser directly.

create table if not exists public.issued_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind ~ '^[a-z][a-z0-9-]{1,40}$'),
  year smallint not null,
  seq integer not null check (seq > 0),
  number text not null,
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, year, seq)
);
create index if not exists issued_documents_created_idx on public.issued_documents (created_at desc);

alter table public.issued_documents enable row level security;
revoke all on public.issued_documents from anon, authenticated;
grant all on public.issued_documents to service_role;
