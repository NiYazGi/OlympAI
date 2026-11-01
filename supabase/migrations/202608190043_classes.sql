-- Teachers, classes, and what a teacher is allowed to see.
--
-- Until now every account in this schema was one student training alone. A
-- teacher is a different thing: they do not practise, they watch. So the
-- profile grows a role, and two tables carry the relation between a teacher
-- and the students they watch.
--
-- The interesting part of this migration is not the tables. It is the question
-- of what a teacher may read, which is settled here in policies rather than in
-- a page that could forget to filter.

alter table public.profiles
  add column if not exists role text not null default 'student'
    check (role in ('student', 'teacher'));

-- ----------------------------------------------------------- the join code ---
-- Six characters a teacher can read aloud across a classroom, which is why
-- the alphabet has no I, L, O, 0 or 1 in it: those are the pairs that get
-- misheard and mistyped. 31^6 is about 900 million, so a collision is a
-- surprise and the unique index is there to make it a loud one.
create or replace function public.gen_join_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  -- Which subject the class is for. Optional: a teacher may run one group
  -- across both, and the roster reads the same either way.
  subject_id uuid references public.subjects(id) on delete set null,
  join_code text not null unique default public.gen_join_code(),
  created_at timestamptz not null default now()
);

create index if not exists classes_teacher_idx on public.classes(teacher_id, created_at desc);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index if not exists class_members_student_idx on public.class_members(student_id);

-- ------------------------------------------------------------- the helpers ---
-- Three questions every policy below needs to ask, each answered by a
-- security definer function.
--
-- They are definer for one reason: a policy on class_members that read
-- classes, and a policy on classes that read class_members, would evaluate
-- each other's policies and recurse until Postgres gives up. Running the
-- lookup as the owner steps outside row security for the one query that
-- decides row security.
--
-- They are safe to expose: each takes the caller's own auth.uid() and returns
-- a boolean about the caller. None of them can be asked about anybody else.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'
  );
$$;

create or replace function public.owns_class(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c where c.id = target and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.in_class(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = target and m.student_id = auth.uid()
  );
$$;

-- Is the caller the teacher of this student, in any of their classes?
create or replace function public.teaches(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = student and c.teacher_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------------- RLS ---
alter table public.classes enable row level security;
alter table public.class_members enable row level security;

drop policy if exists "Teacher and members can see a class" on public.classes;
create policy "Teacher and members can see a class"
  on public.classes for select to authenticated
  using (auth.uid() = teacher_id or public.in_class(id));

-- Only a teacher account may own a class. A student who found this endpoint
-- would otherwise be able to create one and start collecting rosters.
drop policy if exists "Teachers can open a class" on public.classes;
create policy "Teachers can open a class"
  on public.classes for insert to authenticated
  with check (auth.uid() = teacher_id and public.is_teacher());

drop policy if exists "Teachers can edit their class" on public.classes;
create policy "Teachers can edit their class"
  on public.classes for update to authenticated
  using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "Teachers can close their class" on public.classes;
create policy "Teachers can close their class"
  on public.classes for delete to authenticated
  using (auth.uid() = teacher_id);

drop policy if exists "Teacher and student can see the membership" on public.class_members;
create policy "Teacher and student can see the membership"
  on public.class_members for select to authenticated
  using (student_id = auth.uid() or public.owns_class(class_id));

-- No insert policy, on purpose. Joining is checked against the join code, and
-- a policy can only see who is writing, not what they knew: with a client
-- insert, anyone who learned a class id could add themselves without the code.
-- app/(app)/class/actions.ts verifies the code and writes the row with the
-- service role, the same arrangement grading uses.
drop policy if exists "Leaving and removing" on public.class_members;
create policy "Leaving and removing"
  on public.class_members for delete to authenticated
  using (student_id = auth.uid() or public.owns_class(class_id));

-- ------------------------------------------- what a teacher may read ---
-- Additive policies: a student keeps exactly the access they had, and a
-- teacher gains read-only sight of the students in their own classes.
--
-- The list is deliberately short, and it is a list of work rather than of
-- person. Attempts, mastery, quiz answers, reading and papers are what a
-- teacher is for.
--
-- Three things are left out and stay out:
--   day_states      sleep, state of mind, how much school took. Migration 32
--                   promises the student nobody else can read it, and a
--                   promise about somebody's sleep is not ours to revoke.
--   chat_*          what they asked a tutor when they were stuck. A student
--                   who is read over the shoulder stops asking.
--   flashcards      their own cards and their own ratings, written for nobody.
drop policy if exists "Teachers can see their students" on public.profiles;
create policy "Teachers can see their students"
  on public.profiles for select to authenticated
  using (public.teaches(id));

drop policy if exists "Teachers can see their students' attempts" on public.task_attempts;
create policy "Teachers can see their students' attempts"
  on public.task_attempts for select to authenticated
  using (public.teaches(user_id));

drop policy if exists "Teachers can see their students' mastery" on public.user_progress;
create policy "Teachers can see their students' mastery"
  on public.user_progress for select to authenticated
  using (public.teaches(user_id));

drop policy if exists "Teachers can see their students' answers" on public.quiz_attempts;
create policy "Teachers can see their students' answers"
  on public.quiz_attempts for select to authenticated
  using (public.teaches(user_id));

drop policy if exists "Teachers can see their students' reading" on public.lesson_views;
create policy "Teachers can see their students' reading"
  on public.lesson_views for select to authenticated
  using (public.teaches(user_id));

drop policy if exists "Teachers can see their students' papers" on public.mock_tests;
create policy "Teachers can see their students' papers"
  on public.mock_tests for select to authenticated
  using (public.teaches(user_id));

-- --------------------------------------------------------- new accounts ---
-- The role arrives in the sign-up metadata and is narrowed to the two values
-- the column allows: anything else, including an absent value, is a student.
--
-- A teacher also skips onboarding. Those six questions — grade, level, which
-- subject you are training for, how many evenings a week — are a student's
-- questions, and asking a teacher to answer them before they can open the app
-- would be asking them to make something up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text := case
    when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher'
    else 'student'
  end;
begin
  insert into public.profiles (id, full_name, telegram_username, role, onboarding_completed_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(lower(new.raw_user_meta_data ->> 'telegram_username'), ''),
    new_role,
    case when new_role = 'teacher' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
