alter table public.preparation_preferences add column daily_tasks smallint not null default 5 check (daily_tasks between 1 and 10);

create table public.preparation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  on_date date not null,
  topic_id uuid references public.topics(id) on delete cascade,
  lesson_id text references public.lessons(id) on delete cascade,
  task_ids text[] not null,
  question_ids text[] not null default '{}',
  minutes integer not null check (minutes > 0),
  mock_key text,
  full_paper boolean not null default false,
  lesson_completed_at timestamptz,
  quiz_completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, scope, on_date)
);
alter table public.preparation_sessions enable row level security;
revoke all on public.preparation_sessions from anon, authenticated;
grant select on public.preparation_sessions to authenticated;
create policy "Read own daily program" on public.preparation_sessions for select to authenticated using (auth.uid() = user_id);

alter table public.quiz_attempts add column preparation_session_id uuid references public.preparation_sessions(id) on delete set null;
create index quiz_attempts_daily_session on public.quiz_attempts(preparation_session_id, question_id);
