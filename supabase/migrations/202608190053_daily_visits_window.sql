-- A visit can only be recorded for today.
--
-- Migration 52 let an account insert its own visits and checked only whose
-- they were. The server action checks the date too, but the table is reachable
-- from any browser with the publishable key, and from there a student could
-- insert every day of last month and wake up with a thirty-day flame. The
-- window is the same as the action's: the caller's day may be a day either
-- side of UTC, because time zones are, and no further.

drop policy if exists "Users record their own visits" on public.daily_visits;
create policy "Users record their own visits"
  on public.daily_visits for insert to authenticated
  with check (
    auth.uid() = user_id
    and day between (now() at time zone 'utc')::date - 1
                and (now() at time zone 'utc')::date + 1
  );
