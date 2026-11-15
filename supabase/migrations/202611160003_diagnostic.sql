-- A baseline belongs to one account, subject and school-grade scope.
-- Answers are written by authenticated server actions, never by the browser role.
create table if not exists public.preparation_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('Mathematics','Physics','Informatics')),
  school_grade text,
  scope text not null,
  version text not null,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers)='object'),
  self_report jsonb,
  result jsonb,
  goal_snapshot jsonb not null default '{}'::jsonb,
  estimated_minutes integer not null default 12 check (estimated_minutes between 1 and 120),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((completed_at is null and result is null) or (completed_at is not null and result is not null))
);
create index if not exists preparation_diagnostics_owner_scope_idx on public.preparation_diagnostics(user_id,scope,started_at desc);
create unique index if not exists preparation_diagnostics_one_open_idx on public.preparation_diagnostics(user_id,scope) where completed_at is null;
alter table public.preparation_diagnostics enable row level security;
revoke all on public.preparation_diagnostics from anon,authenticated;
grant select on public.preparation_diagnostics to authenticated;
grant all on public.preparation_diagnostics to service_role;
drop policy if exists "Read own baseline diagnostic" on public.preparation_diagnostics;
create policy "Read own baseline diagnostic" on public.preparation_diagnostics for select to authenticated using (auth.uid()=user_id);
