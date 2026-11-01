-- A class's plan, written by its teacher rather than generated for them.
--
-- Migration 44 let a teacher reorder the sections and say how many problems
-- each asks for. Everything else about the route was still a template: every
-- section was in it, its problems were "the easiest N", and its week came out
-- of the student's pace. A teacher who skips waves this year, sets the twelve
-- geometry problems they actually teach from and wants combinatorics done
-- before the winter break could say none of it.
--
-- Three columns on the row a teacher already writes, and one table for the
-- problems they choose. A section with nothing set still has no row at all, so
-- a teacher who changes one section has not taken over the other twelve.

alter table public.class_tracks
  -- Out of this class's route. The section is not deleted for anyone — it is
  -- still in the library — it is just not something this class is asked for.
  add column if not exists skipped boolean not null default false,
  -- When the teacher wants the section finished. A date, not a week number:
  -- "by 20 December" is what a teacher says and what a student can plan to.
  add column if not exists due_date date,
  -- What the teacher wants the class to know about the section: which chapter
  -- of the book goes with it, what will be on Friday's quiz.
  add column if not exists note text check (note is null or length(note) <= 500);

-- ------------------------------------------------------ chosen problems ---
-- The problems a teacher picked for a section, in the order they want them
-- solved. When a section has any, they are the section: the route asks for
-- these and nothing else. When it has none, the route falls back to the
-- easiest N, as before.
--
-- Keyed by (class, task): a problem belongs to one section, and choosing it
-- twice for the same class is a mistake rather than a wish.
create table if not exists public.class_track_tasks (
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  position smallint not null check (position between 0 and 999),
  primary key (class_id, task_id)
);

create index if not exists class_track_tasks_order_idx
  on public.class_track_tasks(class_id, topic_id, position);

alter table public.class_track_tasks enable row level security;

-- Who may read and write is exactly who may for class_tracks: the class's
-- teacher writes, the teacher and the students in it read.
drop policy if exists "Teacher and students can read chosen problems" on public.class_track_tasks;
create policy "Teacher and students can read chosen problems"
  on public.class_track_tasks for select to authenticated
  using (public.owns_class(class_id) or public.in_class(class_id));

drop policy if exists "Teachers choose their class's problems" on public.class_track_tasks;
create policy "Teachers choose their class's problems"
  on public.class_track_tasks for insert to authenticated
  with check (public.owns_class(class_id));

drop policy if exists "Teachers change their class's problems" on public.class_track_tasks;
create policy "Teachers change their class's problems"
  on public.class_track_tasks for update to authenticated
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));

drop policy if exists "Teachers clear their class's problems" on public.class_track_tasks;
create policy "Teachers clear their class's problems"
  on public.class_track_tasks for delete to authenticated
  using (public.owns_class(class_id));

-- ---------------------------------------------------------- one save ---
-- Saving a plan replaces it: the section rows and the chosen problems
-- together. As two deletes and two inserts from the app, a failure half-way
-- left a class with its new order and no problems — and every student in it
-- on a route the teacher never wrote. One function, one transaction.
--
-- Security invoker: it runs as the teacher, so the policies above decide what
-- it may touch, and a call for somebody else's class deletes nothing.
create or replace function public.save_class_plan(target uuid, sections jsonb, chosen jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.owns_class(target) then
    raise exception 'not your class' using errcode = '42501';
  end if;

  delete from public.class_track_tasks where class_id = target;
  delete from public.class_tracks where class_id = target;

  insert into public.class_tracks (class_id, topic_id, position, target, skipped, due_date, note)
  select target, s.topic_id, s.position, s.target, coalesce(s.skipped, false), s.due_date, s.note
  from jsonb_to_recordset(coalesce(sections, '[]'::jsonb))
    as s(topic_id uuid, position smallint, target smallint, skipped boolean, due_date date, note text);

  insert into public.class_track_tasks (class_id, topic_id, task_id, position)
  select target, c.topic_id, c.task_id, c.position
  from jsonb_to_recordset(coalesce(chosen, '[]'::jsonb))
    as c(topic_id uuid, task_id text, position smallint);
end;
$$;

revoke all on function public.save_class_plan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_class_plan(uuid, jsonb, jsonb) to authenticated;
