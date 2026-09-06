-- Close the self-grading holes left by the initial migration.
--
-- Background: every client-side write in this app goes through the publishable
-- key with the signed-in user's JWT. Any policy that lets a user write a row
-- also lets them choose its contents from the browser console. Three tables
-- were exposed that way.

-- 1. user_progress is derived state. It is written exclusively by the
--    record_task_attempt_progress trigger, which is security definer and
--    therefore bypasses RLS. The client-facing policies let any signed-in user
--    PATCH their own row and set mastery_score to 100. Reads stay allowed.
drop policy if exists "Users can create their progress" on public.user_progress;
drop policy if exists "Users can update their progress" on public.user_progress;

-- 2. An attempt is an immutable record of what was submitted and how it was
--    graded. The update policy let a user flip is_correct to true and score to
--    100 after the fact, which then re-ran the progress trigger's arithmetic
--    against fabricated input.
drop policy if exists "Users can update their attempts" on public.task_attempts;

-- 3. The insert policy only checked that user_id matched the session. It did
--    not — and with RLS alone cannot — constrain is_correct or score, so a user
--    could POST a perfect attempt without ever calling the grader. Attempts are
--    now written only by the server, through the service-role key, after the
--    grader has run. The client keeps read access to its own attempts.
drop policy if exists "Users can create their attempts" on public.task_attempts;

-- Record which grader produced the verdict, so the score is attributable.
alter table public.task_attempts
  add column if not exists graded_by text not null default 'model',
  add column if not exists model text;

-- Supports "has this user solved this task" on the task catalogue.
create index if not exists task_attempts_user_task_idx
  on public.task_attempts(user_id, task_id);

-- Supports the per-hour rate-limit counts.
create index if not exists task_attempts_user_created_idx
  on public.task_attempts(user_id, created_at desc);
create index if not exists chat_messages_session_created_idx
  on public.chat_messages(session_id, created_at desc);

-- Profile fields are user-writable and two of them (level, primary_subject)
-- are interpolated into the coach's system instructions. The application validates
-- them against closed option lists; these bounds make an oversized value
-- impossible even if a client writes the row directly with the publishable key.
do $$
declare
  col text;
begin
  foreach col in array array[
    'full_name', 'username', 'grade', 'primary_subject',
    'level', 'goal', 'target_competition_type', 'training_intensity'
  ] loop
    if not exists (
      select 1 from pg_constraint where conname = format('profiles_%s_len', col)
    ) then
      execute format(
        'alter table public.profiles add constraint %I check (%I is null or length(%I) <= 120)',
        format('profiles_%s_len', col), col, col
      );
    end if;
  end loop;
end
$$;
