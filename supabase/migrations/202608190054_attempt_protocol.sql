-- The grader's protocol: what it marked, line by line, and on what scheme.
--
-- Until now an attempt kept one paragraph of feedback and a score out of 100.
-- A jury marks a solution against its own lines and a scheme out of seven, and
-- what a student needs from the result is where the argument broke, not only
-- that it did. So the attempt now keeps the points out of seven, the jury's one
-- sentence, the marks on its lines, the criteria and the first break.
--
-- Everything is nullable. Attempts graded before this keep their paragraph and
-- their score, and nothing is invented for them. `score` stays and is still
-- written, as the points scaled to a hundred, because mastery, XP and the
-- route all read it.

alter table public.task_attempts
  add column if not exists points smallint check (points between 0 and 7),
  add column if not exists summary text,
  add column if not exists marks jsonb,
  add column if not exists criteria jsonb,
  add column if not exists break_point jsonb;
