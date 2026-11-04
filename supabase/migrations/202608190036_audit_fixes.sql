-- Fixes from the November 2026 product audit.
--
-- 1. task_reports: "I think the check is wrong" and "there is a mistake in this
--    statement", sent from the task page with the task and attempt attached,
--    and worked through from /admin/reports. Written with the service role, like
--    task_attempts; a student reads their own reports to see the outcome.
-- 2. profiles.goal_set_at: when the current goal was chosen, so a goal set
--    today is not judged on last week's activity.
-- 3. Content: the connected-bodies lesson stated a rule that only holds for
--    some set-ups and called the two tensions a third-law pair; the algebra
--    key facts said irrational roots always come in conjugate pairs; the coin
--    problem from the GZhO archive read "момент" for "монет".

create table public.task_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  attempt_id uuid references public.task_attempts(id) on delete set null,
  kind text not null check (kind in ('grading', 'statement')),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index task_reports_open_idx on public.task_reports (status, created_at desc);
create index task_reports_user_idx on public.task_reports (user_id, task_id);

alter table public.task_reports enable row level security;
create policy "Users can view their reports" on public.task_reports
  for select using (auth.uid() = user_id);
grant select on public.task_reports to authenticated;
grant all on public.task_reports to service_role;

alter table public.profiles add column if not exists goal_set_at timestamptz;
update public.profiles set goal_set_at = now() where target_date is not null and goal_set_at is null;

-- Connected bodies -----------------------------------------------------------

update public.lesson_blocks
set heading = $h$One string, linked accelerations$h$,
    body = $b$A string that does not stretch has a fixed length, and that is the whole constraint. Write the length in terms of the positions of the bodies, differentiate twice, and you have the relation between their accelerations.

For two bodies on either end of one string — across a table, or over a fixed pulley — the relation is the simplest one: if one end advances a centimetre, so does the other, so the two share one speed and one acceleration magnitude. With a movable pulley it is different: a load hanging from a pulley that rides on the string moves half as far as the free end, so its acceleration is half as large.

Either way the string turns two unknown accelerations into one. Derive the link for the set-up in front of you rather than assuming they are equal.$b$
where lesson_id = 'mechanics-connected-bodies'
  and heading = $h$One acceleration, two bodies$h$;

update public.lesson_blocks
set body = replace(body,
  $o$The string appears in both equations — pulling one body forward and the other backward — and by the third law those two forces have the same magnitude and opposite signs.$o$,
  $n$The string appears in both equations — pulling one body forward and the other backward. For a light string over a frictionless pulley, the tension is the same all along it, so those two forces have the same magnitude. They are not a third-law pair: each one is the string acting on a body, and its partner is that body pulling back on the string.$n$)
where lesson_id = 'mechanics-connected-bodies'
  and heading = $h$Why adding the equations kills the tension$h$;

update public.lesson_blocks
set items = array_replace(items,
  $o$An inextensible string imposes one acceleration magnitude on everything it connects.$o$,
  $n$An inextensible string fixes a relation between accelerations. Over a fixed pulley or straight across a table they are equal; with a movable pulley they are not — derive it from the string's length.$n$)
where $o$An inextensible string imposes one acceleration magnitude on everything it connects.$o$ = any(items);

update public.quiz_questions
set explanation = $e$Each body is pulled by the string with a force equal to the tension; a light string over a frictionless pulley has the same tension all along it, so the two forces have the same magnitude and, in the equations written along each body's motion, opposite signs. In the sum they cancel. They are not a third-law pair — each is the string acting on a body, and its partner is the body acting back on the string. A massless string does not have zero tension; it has the same tension at both ends.$e$
where id = 'mech-q2';

update public.quiz_questions
set prompt = $p$Two blocks of different mass are joined by a light inextensible string and pulled straight along a frictionless table. What is true of their accelerations?$p$
where id = 'mech-q1';

update public.flashcards
set front = $f$What does an inextensible string fix between the bodies it connects?$f$,
    back = $k$A relation between their accelerations, from its constant length. Straight across a table or over a fixed pulley: one shared acceleration magnitude. With a movable pulley the load moves half as far as the free end.$k$
where front = $f$What does an inextensible string force on the bodies it connects?$f$;

-- Roots of real polynomials -----------------------------------------------------

update public.lesson_blocks
set items = array_replace(items,
  $o$Complex and irrational roots of a real polynomial come in conjugate pairs.$o$,
  $n$Non-real roots of a polynomial with real coefficients come in complex-conjugate pairs. Irrational roots pair up as a ± √b only when the coefficients are rational: x - √2 has real coefficients and the single root √2.$n$)
where $o$Complex and irrational roots of a real polynomial come in conjugate pairs.$o$ = any(items);

-- Coin problem ------------------------------------------------------------------

update public.tasks
set problem = $t$По кругу лежат 10 монет. Разрешается одновременно перевернуть или четыре рядом лежащие монеты, или по две слева и справа от какой-то монеты. Можно ли этими операциями перевернуть все 10 монет?$t$
where id = 'gzho-2010-7-3';

-- Sulu conversations opened from a task -------------------------------------------
-- "Ask Sulu AI" on a task opened a blank general chat that could not see the
-- task. A conversation now remembers the task it was started from.

alter table public.chat_sessions
  add column if not exists task_id text references public.tasks(id) on delete set null;
