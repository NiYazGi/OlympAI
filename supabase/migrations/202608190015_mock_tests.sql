-- Mock tests: a timed paper that measures the level the profile currently
-- only asks about.
--
-- Answers are not stored here. They go into task_attempts like any other work,
-- tagged with the test they came from, so a mock counts toward mastery, XP and
-- the path exactly once and the analytics need no special case.

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  -- Ordered, so the paper reads the same every time it is opened.
  task_ids text[] not null check (cardinality(task_ids) between 1 and 12),
  duration_minutes smallint not null check (duration_minutes between 5 and 360),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  -- Filled in on submission.
  score_percent smallint check (score_percent between 0 and 100),
  level text,
  created_at timestamptz not null default now()
);

alter table public.task_attempts
  add column if not exists mock_test_id uuid references public.mock_tests(id) on delete set null,
  add column if not exists source text not null default 'practice'
    check (source in ('practice', 'mock'));

create index if not exists mock_tests_user_idx on public.mock_tests(user_id, started_at desc);
create index if not exists task_attempts_mock_idx on public.task_attempts(mock_test_id);

alter table public.mock_tests enable row level security;

-- A test is created and finished by the server, which holds the service role;
-- the student may read their own papers and nothing else. Letting the client
-- write here would let it choose its own questions and its own result.
drop policy if exists "Users can view their mock tests" on public.mock_tests;
create policy "Users can view their mock tests"
  on public.mock_tests for select using (auth.uid() = user_id);
