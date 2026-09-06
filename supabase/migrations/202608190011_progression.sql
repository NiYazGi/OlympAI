-- Progression: a daily XP goal and a chosen target subject.
--
-- XP itself is not stored. It is derived from task_attempts, the same way the
-- streak and mastery already are, so there is no counter to drift out of sync
-- and none for a client to write. The two columns here are settings, not score.

alter table public.profiles
  add column if not exists daily_xp_goal smallint not null default 50
    check (daily_xp_goal between 10 and 500),
  add column if not exists target_subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists target_date date;

-- The path orders a subject's topics, so this is the lookup it leans on.
create index if not exists topics_subject_idx on public.topics(subject_id);
create index if not exists tasks_topic_idx on public.tasks(topic_id);
