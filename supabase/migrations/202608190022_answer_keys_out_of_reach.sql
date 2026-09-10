-- Take the answer keys away from the browser's role.
--
-- The application has always been careful never to select tasks.official_solution
-- into anything the client receives — reference.ts says so in a comment, and
-- getMockPaper says it again. But the care was entirely in the application. The
-- policy on tasks is `for select to authenticated using (true)` and the grant
-- underneath it was table-wide, so any signed-in student holding the
-- publishable key could ask PostgREST directly:
--
--     GET /rest/v1/tasks?select=id,official_solution
--
-- and be handed the worked solution to every problem in the library, including
-- the ones they are about to be graded on. The same would have been true from
-- birth for quiz_questions.correct_index, which is the answer key to every
-- question in the new check step.
--
-- RLS decides which rows a role may read; it says nothing about which columns.
-- Column privileges are the mechanism for that, and a column-level revoke has
-- no effect while a table-level grant is in place — so the table grant goes
-- and an explicit column list replaces it.
--
-- Note for whoever adds a column to either table next: it will not be readable
-- by `authenticated` until it is added to the grant below. That is the intended
-- direction of failure — a new column is invisible until someone has decided it
-- is safe, rather than exposed until someone notices.

-- ----------------------------------------------------------------- tasks ---
revoke select on public.tasks from authenticated, anon;

grant select (
  id, subject_id, topic_id, title, problem, difficulty, hints, source,
  estimated_minutes, given, find_prompt, diagram_url, source_url, licence,
  attribution, created_at
) on public.tasks to authenticated;

-- ------------------------------------------------------- quiz_questions ---
revoke select on public.quiz_questions from authenticated, anon;

grant select (
  id, topic_id, lesson_id, prompt, options, position, source_url, licence,
  attribution, created_at
) on public.quiz_questions to authenticated;

-- The grader and the marker read the withheld columns with the service role,
-- which holds its own grants and is never handed to a browser.
grant select on public.tasks to service_role;
grant select on public.quiz_questions to service_role;
