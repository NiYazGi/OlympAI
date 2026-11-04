-- School grades per task, and a Geometry topic for mathematics.
--
-- Olympiad papers are set per grade (9, 10, 11 at the regional and national
-- rounds; 6-11 at ГЖО), and a student in grade 8 has no use for an IMO-level
-- problem. A range rather than a single grade, because the international
-- papers are written for an age band, not a class.
--
-- Nullable: a task with no grade is open to everyone.

alter table public.tasks
  add column if not exists grade_min smallint,
  add column if not exists grade_max smallint;

alter table public.tasks drop constraint if exists tasks_grade_range;
alter table public.tasks
  add constraint tasks_grade_range check (
    (grade_min is null and grade_max is null)
    or (grade_min between 1 and 12 and grade_max between grade_min and 12)
  );

create index if not exists tasks_grade_idx on public.tasks (grade_min, grade_max);

-- The archive is roughly a third geometry; filing it under Algebra or
-- Combinatorics would make both meaningless.
insert into public.topics (subject_id, name, slug)
select id, 'Geometry', 'geometry' from public.subjects where slug = 'mathematics'
on conflict (subject_id, slug) do nothing;
