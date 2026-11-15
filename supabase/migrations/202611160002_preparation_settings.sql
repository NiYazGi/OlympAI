-- One preparation configuration and private, append-only motivation history.
alter table public.preparation_preferences
  add column competition_stage text check (competition_stage in ('School','Regional','National','International')),
  add column desired_result text not null default '' check (char_length(desired_result) <= 1000),
  add column personal_why text not null default '' check (char_length(personal_why) <= 2000),
  add column review_percent smallint not null default 20 check (review_percent between 10 and 50),
  add column telegram_reflection_enabled boolean not null default false;

create table public.preparation_goal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  desired_result text not null check (char_length(desired_result) <= 1000),
  personal_why text not null check (char_length(personal_why) <= 2000),
  goal_snapshot jsonb not null check (jsonb_typeof(goal_snapshot) = 'object'),
  created_at timestamptz not null default now()
);
create index preparation_goal_history_owner_date on public.preparation_goal_history(user_id, created_at desc);
alter table public.preparation_goal_history enable row level security;
revoke all on public.preparation_goal_history from anon, authenticated;
grant select on public.preparation_goal_history to authenticated;
grant insert, select on public.preparation_goal_history to service_role;
create policy "Read own preparation goal history" on public.preparation_goal_history
  for select to authenticated using (auth.uid() = user_id);
