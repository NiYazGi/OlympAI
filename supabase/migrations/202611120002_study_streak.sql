-- The streak counts days of study, not days the site was opened.
--
-- A day counts when there was real work in it: a graded solution, a quiz
-- answer, a card review or a lesson finished. Days outside the student's own
-- study schedule (preparation_preferences.weekdays) are rest days: they do not
-- add to the streak and do not break it. Today never breaks it either, because
-- it is not over yet.

create or replace function public.study_days(since date)
returns table (day date)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct d from (
    select (created_at at time zone 'Asia/Almaty')::date as d from public.task_attempts where user_id = auth.uid()
    union all
    select (created_at at time zone 'Asia/Almaty')::date from public.quiz_attempts where user_id = auth.uid()
    union all
    select (created_at at time zone 'Asia/Almaty')::date from public.flashcard_reviews where user_id = auth.uid()
    union all
    select (completed_at at time zone 'Asia/Almaty')::date from public.lesson_views where user_id = auth.uid() and completed_at is not null
  ) as activity
  where d >= since;
$$;
grant execute on function public.study_days(date) to authenticated;

create or replace function public.visit_streak(today date)
returns table (current_streak int, best_streak int, last_day date)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  study_week smallint[];
  active date[];
  first_day date;
  d date;
  run int := 0;
  best int := 0;
  cur int := 0;
  last_active date;
begin
  select weekdays into study_week from public.preparation_preferences where user_id = auth.uid();
  select array_agg(s.day), min(s.day), max(s.day) into active, first_day, last_active from public.study_days(today - 730) s;
  if first_day is null then
    return query select 0, 0, null::date;
    return;
  end if;

  -- One pass forward over the history: the best run, and the run that is
  -- still open on `today`.
  d := first_day;
  while d <= today loop
    if d = any(active) then
      run := run + 1;
    elsif d = today then
      null; -- today is not over
    elsif study_week is not null and not (extract(dow from d)::smallint = any(study_week)) then
      null; -- a planned rest day
    else
      run := 0;
    end if;
    if run > best then best := run; end if;
    d := d + 1;
  end loop;
  cur := run;

  return query select cur, best, last_active;
end;
$$;
grant execute on function public.visit_streak(date) to authenticated;
