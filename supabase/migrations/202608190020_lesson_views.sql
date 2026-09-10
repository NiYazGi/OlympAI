-- Which lessons a student has opened, and which they say they have finished.
--
-- The rest of this schema derives progress from evidence: a grade exists
-- because a grader produced it. Reading is different — there is no artefact to
-- measure, and inferring "understood" from a page view would be inventing a
-- fact about somebody's learning. So this table records the two things that
-- are actually true: they opened it, and they said they were done with it.
-- The interface labels them that way rather than as a score.
--
-- Both are the student's own claims about their own reading. They unlock
-- nothing and pay no XP, so unlike an attempt they are safe to write from the
-- client under RLS.
create table if not exists public.lesson_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

create index if not exists lesson_views_user_idx on public.lesson_views(user_id, lesson_id);

alter table public.lesson_views enable row level security;

drop policy if exists "Users can view their lesson views" on public.lesson_views;
create policy "Users can view their lesson views"
  on public.lesson_views for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can record their lesson views" on public.lesson_views;
create policy "Users can record their lesson views"
  on public.lesson_views for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their lesson views" on public.lesson_views;
create policy "Users can update their lesson views"
  on public.lesson_views for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
