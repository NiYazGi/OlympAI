-- The flame: one row per day an account opened the app.
--
-- The streak until now counted days with a submitted attempt or a quiz answer.
-- The flame counts something simpler and earlier, the way Duolingo's does:
-- that you came back. Opening the app is the habit everything else hangs off,
-- and a streak that only a solved problem could keep was one most beginners
-- never got past zero.
--
-- The day is the student's own calendar day, sent by their browser, not the
-- server's UTC date: at two in the morning in Almaty it is already tomorrow,
-- and a visit then belongs to tomorrow. The server action checks the date is
-- within a day of UTC either side, which every time zone on Earth is.

create table if not exists public.daily_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_visits enable row level security;

drop policy if exists "Users read their own visits" on public.daily_visits;
create policy "Users read their own visits"
  on public.daily_visits for select to authenticated
  using (auth.uid() = user_id);

-- Insert only, and only for yourself. No update and no delete: a day cannot be
-- moved or taken back, which is what makes it a record rather than a setting.
drop policy if exists "Users record their own visits" on public.daily_visits;
create policy "Users record their own visits"
  on public.daily_visits for insert to authenticated
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------ the count ---
-- The current run and the longest one, as gaps-and-islands over the days:
-- consecutive dates minus their row number share a value, so each run is one
-- group. Done here rather than in the app because the app reads at most a
-- thousand rows per request, and a three-year streak is more days than that.
--
-- `today` is the caller's calendar day. The current run is the one that ends
-- today or yesterday — a streak survives "not yet today", as Duolingo's does,
-- and goes out only when a whole day passes without a visit.
create or replace function public.visit_streak(today date)
returns table (current_streak int, best_streak int, last_day date)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (
    select day from public.daily_visits where user_id = auth.uid()
  ),
  grouped as (
    select day, day - (row_number() over (order by day))::int as run from days
  ),
  runs as (
    select max(day) as ends, count(*)::int as length from grouped group by run
  )
  select
    coalesce((select length from runs where ends >= today - 1 order by ends desc limit 1), 0),
    coalesce((select max(length) from runs), 0),
    (select max(day) from days);
$$;

grant execute on function public.visit_streak(date) to authenticated;
