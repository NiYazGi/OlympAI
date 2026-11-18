-- The coaching loop around graded work: papers that can be closed, a mistake
-- log that ends in a fresh problem solved without help, appeals against a
-- mark, and a pilot cohort to measure all of it on a small group first.
--
-- All new tables are read and written by the server only, after it has
-- checked the session (service role), like billing and the forum.

-- A paper whose time is long gone, or that the student walked away from, is
-- closed rather than left "open": an open paper blocks starting a new one.
alter table public.mock_tests add column if not exists abandoned_at timestamptz;

create table if not exists public.mistake_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null references public.tasks (id) on delete cascade,
  attempt_id uuid references public.task_attempts (id) on delete set null,
  mock_test_id uuid references public.mock_tests (id) on delete set null,
  -- Where the argument stopped, from the grader's break point.
  break_need text,
  points smallint check (points between 0 and 7),
  reason text check (reason in ('knowledge', 'method', 'calculation', 'presentation', 'reading', 'time', 'other')),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'retest', 'fixed')),
  retest_task_id text references public.tasks (id) on delete set null,
  retest_tries smallint not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  fixed_at timestamptz,
  unique (user_id, task_id)
);
create index if not exists mistake_entries_user_idx on public.mistake_entries (user_id, status, created_at desc);
create index if not exists mistake_entries_retest_idx on public.mistake_entries (user_id, retest_task_id) where retest_task_id is not null;

create table if not exists public.grading_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.task_attempts (id) on delete cascade,
  task_id text not null references public.tasks (id) on delete cascade,
  -- practice: the appeal trainer, the mark never changes; dispute: a real
  -- request to re-check, which may change the mark.
  mode text not null check (mode in ('practice', 'dispute')),
  criterion text not null default '' check (char_length(criterion) <= 400),
  lines smallint[] not null default '{}',
  argument text not null check (char_length(argument) between 20 and 3000),
  verdict text check (verdict in ('upheld', 'partial', 'rejected')),
  points_before smallint check (points_before between 0 and 7),
  points_after smallint check (points_after between 0 and 7),
  jury_response text,
  argument_feedback text,
  argument_score smallint check (argument_score between 0 and 5),
  created_at timestamptz not null default now()
);
create index if not exists grading_appeals_user_idx on public.grading_appeals (user_id, created_at desc);
create index if not exists grading_appeals_created_idx on public.grading_appeals (created_at desc);

-- The mark a dispute settled on replaces the grader's; the original stays here.
alter table public.task_attempts add column if not exists regraded_from smallint check (regraded_from between 0 and 7);

-- Pilot cohort: who tries the coaching updates first, and since when.
alter table public.profiles add column if not exists cohort text check (cohort is null or cohort in ('pilot', 'control'));
alter table public.profiles add column if not exists cohort_since timestamptz;

do $$
declare
  name text;
begin
  foreach name in array array['mistake_entries', 'grading_appeals'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from anon, authenticated', name);
    execute format('grant all on public.%I to service_role', name);
  end loop;
end $$;
