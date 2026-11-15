-- Keep legacy programs as history. New programs store honest timed chunks.
alter table public.preparation_sessions
  add column goal_key text not null default '',
  add column plan_version text not null default 'legacy',
  add column phase text not null default 'foundation' check (phase in ('foundation','strengthening','competition','taper','rest')),
  add column session_kind text not null default 'study' check (session_kind in ('study','mock','review')),
  add column budget_minutes integer check (budget_minutes between 0 and 360),
  add column lesson_minutes integer not null default 0 check (lesson_minutes >= 0),
  add column task_minutes integer[] not null default '{}',
  add column quiz_minutes integer not null default 0 check (quiz_minutes >= 0),
  add column review_minutes integer not null default 0 check (review_minutes >= 0),
  add column lesson_part integer not null default 0,
  add column lesson_parts integer not null default 0,
  add column task_parts integer[] not null default '{}',
  add column task_part_totals integer[] not null default '{}',
  add column quiz_part integer not null default 0,
  add column quiz_parts integer not null default 0,
  add column review_mock_key text,
  add column review_part integer not null default 0,
  add column review_parts integer not null default 0,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column skipped_at timestamptz,
  add column superseded_at timestamptz,
  add column actual_minutes integer check (actual_minutes between 1 and 720),
  add column reflection text check (char_length(reflection) <= 2000),
  add constraint preparation_session_budget check (budget_minutes is null or minutes <= budget_minutes);
alter table public.preparation_sessions drop constraint preparation_sessions_user_id_scope_on_date_key;
create unique index preparation_one_active_session_per_day on public.preparation_sessions(user_id,scope,on_date)
  where completed_at is null and skipped_at is null and superseded_at is null;
create index preparation_session_goal_history on public.preparation_sessions(user_id,goal_key,on_date);

create table public.preparation_plan_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  fingerprint text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id,scope)
);
alter table public.preparation_plan_state enable row level security;
revoke all on public.preparation_plan_state from anon,authenticated;
grant select on public.preparation_plan_state to authenticated;
grant all on public.preparation_plan_state to service_role;
create policy "Read own program revision" on public.preparation_plan_state for select to authenticated using(auth.uid()=user_id);

-- Optional Telegram-only self-assessment. No invented or approved scoring rubric.
create table public.telegram_reflection_sessions (
  chat_id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  step integer not null default 0 check (step between 0 and 4),
  answers jsonb not null default '{}' check(jsonb_typeof(answers)='object'),
  updated_at timestamptz not null default now()
);
create table public.telegram_reflections (
  user_id uuid not null references auth.users(id) on delete cascade,
  on_date date not null,
  load_score smallint not null check(load_score between 0 and 5),
  solving_score smallint not null check(solving_score between 0 and 5),
  theory_score smallint not null check(theory_score between 0 and 5),
  mental_score smallint not null check(mental_score between 0 and 5),
  sleep_score smallint not null check(sleep_score between 0 and 5),
  criteria_status text not null default 'self-report-pending-approval',
  created_at timestamptz not null default now(),
  primary key(user_id,on_date)
);
alter table public.telegram_reflection_sessions enable row level security;
alter table public.telegram_reflections enable row level security;
revoke all on public.telegram_reflection_sessions, public.telegram_reflections from anon,authenticated;
grant all on public.telegram_reflection_sessions, public.telegram_reflections to service_role;
grant select on public.telegram_reflections to authenticated;
create policy "Read own optional Telegram reflection" on public.telegram_reflections for select to authenticated using(auth.uid()=user_id);
