create table public.preparation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekdays smallint[] not null check (
    cardinality(weekdays) between 1 and 7 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    and array_position(weekdays, null) is null
  ),
  session_minutes smallint not null check (session_minutes between 15 and 360),
  school_grade smallint check (school_grade between 6 and 12)
);

alter table public.preparation_preferences enable row level security;
grant select, insert, update, delete on public.preparation_preferences to authenticated;
create policy "Manage own preparation preferences" on public.preparation_preferences
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.mock_tests add column preparation_key text, add column preparation_reviewed_at timestamptz;
-- A repeated submission to start the same route step resumes its existing paper.
create unique index mock_tests_preparation_key on public.mock_tests(user_id, preparation_key);
