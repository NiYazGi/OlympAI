-- The study layer that was missing between "here is a topic" and "here is a
-- five-star olympiad problem".
--
-- Until now the only content in the app was tasks, so a student arrived at a
-- graded derivation with nothing in between. This adds the three steps that
-- come first — read it, check you followed it, keep it — and leaves the
-- existing task library as the fourth.
--
--   lesson (small blocks)  ->  quiz (instant marking)  ->  cards (recall)  ->  tasks
--
-- Three rules carried over from the rest of the schema:
--
-- 1. An answer key never travels with the question. quiz_questions.correct_index
--    and .explanation are to quizzes what tasks.official_solution is to tasks:
--    excluded from every client-facing read, consulted only on the server.
-- 2. A row the browser can write is a row the browser can score, so
--    quiz_attempts has no client insert policy. Reviews are different — a
--    self-rating is not a grade and pays nothing — so those the client writes.
-- 3. Provenance travels with content. Every table here records where it came
--    from, and a trigger refuses material whose licence is 'unknown'.

-- One reusable guard, rather than a copy of reject_unlicensed_resource() per
-- table. The 0017 function stays where it is: it names resources.url in its
-- message, and an applied migration is never edited.
create or replace function public.reject_unlicensed_content()
returns trigger
language plpgsql
as $$
begin
  if new.licence = 'unknown' then
    raise exception
      '%.licence is "unknown" for %: record the licence before inserting, or do not insert it',
      tg_table_name, new.id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- lessons ---
-- Text ids, like tasks: a seed file that reads 'newtons-second-law' is a seed
-- file you can review.
create table if not exists public.lessons (
  id text primary key,
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  summary text,
  estimated_minutes smallint check (estimated_minutes is null or estimated_minutes between 1 and 240),
  position smallint not null default 0,
  source_url text,
  licence public.content_licence not null default 'unknown',
  attribution text,
  created_at timestamptz not null default now()
);

-- The point of the format: a lesson is a sequence of short blocks, not one
-- long page. The four kinds are the whole vocabulary — a block either states
-- an idea, explains it, works an example, or lists what has to be remembered.
create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.lessons(id) on delete cascade,
  kind text not null check (kind in ('concept', 'explanation', 'example', 'key_facts')),
  heading text,
  body text,
  items text[] not null default '{}',
  position smallint not null default 0,
  -- A block that says nothing is a rendering bug waiting to happen.
  constraint lesson_blocks_not_empty
    check (coalesce(body, '') <> '' or coalesce(array_length(items, 1), 0) > 0)
);

create index if not exists lessons_topic_idx on public.lessons(topic_id, position);
create index if not exists lesson_blocks_lesson_idx on public.lesson_blocks(lesson_id, position);

alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;

drop policy if exists "Signed-in users can view lessons" on public.lessons;
create policy "Signed-in users can view lessons"
  on public.lessons for select to authenticated using (true);

drop policy if exists "Signed-in users can view lesson blocks" on public.lesson_blocks;
create policy "Signed-in users can view lesson blocks"
  on public.lesson_blocks for select to authenticated using (true);

drop trigger if exists on_lesson_licence on public.lessons;
create trigger on_lesson_licence
before insert or update on public.lessons
for each row execute procedure public.reject_unlicensed_content();

-- --------------------------------------------------------------- quizzes ---
-- Single-correct multiple choice only, on purpose: marking has to be instant
-- and beyond argument, which is what makes this the check step rather than a
-- second grading step. Free-text answers already have a home — tasks.
create table if not exists public.quiz_questions (
  id text primary key,
  topic_id uuid not null references public.topics(id) on delete cascade,
  lesson_id text references public.lessons(id) on delete set null,
  prompt text not null,
  options text[] not null,
  correct_index smallint not null,
  -- Shown only after the student has answered, never before.
  explanation text not null,
  position smallint not null default 0,
  source_url text,
  licence public.content_licence not null default 'unknown',
  attribution text,
  created_at timestamptz not null default now(),
  constraint quiz_questions_option_count
    check (array_length(options, 1) between 2 and 6),
  constraint quiz_questions_correct_in_range
    check (correct_index >= 0 and correct_index < array_length(options, 1))
);

create index if not exists quiz_questions_topic_idx on public.quiz_questions(topic_id, position);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references public.quiz_questions(id) on delete cascade,
  chosen_index smallint not null check (chosen_index >= 0),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_question_idx
  on public.quiz_attempts(user_id, question_id);
create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts(user_id, created_at desc);

alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Signed-in users can view quiz questions" on public.quiz_questions;
create policy "Signed-in users can view quiz questions"
  on public.quiz_questions for select to authenticated using (true);

-- Read your own results. Writing them is the server's job: is_correct decided
-- in the browser is not a result.
drop policy if exists "Users can view their quiz attempts" on public.quiz_attempts;
create policy "Users can view their quiz attempts"
  on public.quiz_attempts for select to authenticated using (auth.uid() = user_id);

drop trigger if exists on_quiz_question_licence on public.quiz_questions;
create trigger on_quiz_question_licence
before insert or update on public.quiz_questions
for each row execute procedure public.reject_unlicensed_content();

-- ------------------------------------------------------------ flashcards ---
-- user_id null means a shared card everyone sees; set, it is a card that
-- student wrote for themselves and nobody else can read.
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  front text not null check (length(front) between 1 and 300),
  back text not null check (length(back) between 1 and 1000),
  position smallint not null default 0,
  source_url text,
  licence public.content_licence not null default 'unknown',
  attribution text,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_topic_idx on public.flashcards(topic_id, position);
create index if not exists flashcards_owner_idx on public.flashcards(user_id, topic_id);

-- An append-only log. What is due when is computed from it on read, like
-- everything else here — there is no interval column to drift out of step
-- with the reviews that produced it.
create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.flashcards(id) on delete cascade,
  -- 0 forgot · 1 hard · 2 good · 3 easy
  rating smallint not null check (rating between 0 and 3),
  created_at timestamptz not null default now()
);

create index if not exists flashcard_reviews_user_card_idx
  on public.flashcard_reviews(user_id, card_id, created_at desc);

alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;

drop policy if exists "Users can view shared and own flashcards" on public.flashcards;
create policy "Users can view shared and own flashcards"
  on public.flashcards for select to authenticated
  using (user_id is null or auth.uid() = user_id);

-- Own decks are writable; the shared ones are not, by anyone holding the
-- publishable key. A card with user_id null cannot be created here at all.
drop policy if exists "Users can write their own flashcards" on public.flashcards;
create policy "Users can write their own flashcards"
  on public.flashcards for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can edit their own flashcards" on public.flashcards;
create policy "Users can edit their own flashcards"
  on public.flashcards for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own flashcards" on public.flashcards;
create policy "Users can delete their own flashcards"
  on public.flashcards for delete to authenticated
  using (auth.uid() = user_id);

-- A self-rating is not a grade: it pays no XP and unlocks nothing, so the
-- client may write it directly.
drop policy if exists "Users can view their reviews" on public.flashcard_reviews;
create policy "Users can view their reviews"
  on public.flashcard_reviews for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can record their reviews" on public.flashcard_reviews;
create policy "Users can record their reviews"
  on public.flashcard_reviews for insert to authenticated
  with check (auth.uid() = user_id);

-- Flashcards need their own version of the guard. A card a student wrote for
-- themselves is original by definition and is never shown to anyone else, so
-- demanding that they classify its licence would be a question with one
-- answer. A shared card still has to state its terms.
create or replace function public.reject_unlicensed_flashcard()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null then
    if new.licence = 'unknown' then
      new.licence := 'original';
    end if;
    return new;
  end if;

  if new.licence = 'unknown' then
    raise exception
      'flashcards.licence is "unknown" for a shared card (%): record the licence before inserting, or do not insert it',
      new.front;
  end if;
  return new;
end;
$$;

drop trigger if exists on_flashcard_licence on public.flashcards;
create trigger on_flashcard_licence
before insert or update on public.flashcards
for each row execute procedure public.reject_unlicensed_flashcard();
