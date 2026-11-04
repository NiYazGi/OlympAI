-- Features from the original project's `redesign-a` branch (its migrations
-- 31–55), ported onto this database and renumbered after ours.
--
-- Kept as the original wrote them, with these differences:
--   * no olympiad catalogue rows: ours stays empty until an admin fills it in,
--     so only the schema of the olympiad write-ups comes across;
--   * no problem imports: the library is this project's own archive, and the
--     daryn.kz papers come in their own migration;
--   * Kazakh is a third locale for olympiad write-ups;
--   * physics already had "Oscillations and Waves" (oscillations-waves), which
--     stands in for the original's "waves";
--   * class files live on the server's disk, not in a storage bucket, so the
--     bucket row is not created;
--   * the day-state table is created in its final shape (the original's 32
--     and 38 together), since it holds nothing here yet.

-- ------------------------------------------------------- further reading ---
-- The standard open reference for each subject, listed at the end of a topic.
-- Only mathematics and physics: the other subjects are hidden below.
insert into public.resources (topic_id, kind, title, url, description, licence, attribution, position)
select t.id, 'reference', source.title, source.url, source.description,
       source.licence::public.content_licence, source.attribution, source.position
from public.topics t
join public.subjects s on s.id = t.subject_id
join (
  values
    ('physics', 'OpenStax — University Physics',
     'https://openstax.org/details/books/university-physics-volume-1',
     'The standard free treatment of the underlying theory, with worked examples and end-of-chapter problems. University first-year level rather than olympiad level: use it to fill a gap, not to train.',
     'cc-by', 'OpenStax, CC BY 4.0', 0),
    ('mathematics', 'OpenStax — Algebra and Trigonometry 2e',
     'https://openstax.org/details/books/algebra-and-trigonometry-2e',
     'The technique underneath olympiad problems: identities, inequalities, functions. Not a problem book — the problems here are exercises, and the difference matters.',
     'cc-by', 'OpenStax, CC BY 4.0', 0),
    ('mathematics', 'Project Euler',
     'https://projecteuler.net/archives',
     'Number theory and combinatorics as programming problems. Non-commercial licence, which this app currently satisfies.',
     'cc-by-nc-sa', 'Project Euler, CC BY-NC-SA 4.0', 1)
) as source(subject_slug, title, url, description, licence, attribution, position)
  on source.subject_slug = s.slug
where not exists (select 1 from public.resources r where r.topic_id = t.id and r.url = source.url);

-- -------------------------------------------------------------- the day ---
-- The day as the student reports it, five axes scored by lib/day-state.ts:
-- theory, solving, head, sleep and how much the rest of life took. Their own
-- record of their own week: nobody else, a teacher included, can read it.
create table if not exists public.day_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  on_date date not null,
  sleep_hours numeric(3, 1) not null default 0 check (sleep_hours >= 0 and sleep_hours <= 16),
  -- In bed by 22:30. Only binds in the last fortnight before the paper.
  lights_out boolean not null default false,
  theory_minutes integer not null default 0 check (theory_minutes >= 0 and theory_minutes <= 1080),
  solving_minutes integer not null default 0 check (solving_minutes >= 0 and solving_minutes <= 1080),
  -- 0 means "not answered", which is different from 1, "bad".
  mental smallint not null default 0 check (mental >= 0 and mental <= 5),
  -- What school and everything else took; scored in reverse.
  load_minutes integer not null default 0 check (load_minutes >= 0 and load_minutes <= 1080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, on_date)
);

create index if not exists day_states_user_date_idx on public.day_states(user_id, on_date desc);

alter table public.day_states enable row level security;

drop policy if exists "Users can view their days" on public.day_states;
create policy "Users can view their days"
  on public.day_states for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can record their days" on public.day_states;
create policy "Users can record their days"
  on public.day_states for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can correct their days" on public.day_states;
create policy "Users can correct their days"
  on public.day_states for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- What the medal is for: the student's own sentence, never validated.
alter table public.profiles add column if not exists target_university text;

-- ------------------------------------------------- olympiad write-ups ---
-- Everything about an olympiad except when it happens: the shape of the
-- papers, who may enter, how you get there, the founding year and the official
-- page. Dates stay out; the student's target date is their own.
alter table public.competitions
  add column if not exists region text,
  add column if not exists founded integer,
  add column if not exists official_url text,
  add column if not exists papers_url text,
  add column if not exists active boolean not null default true;

create table if not exists public.competition_details (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  locale text not null check (locale in ('en', 'ru', 'kk')),
  summary text not null,
  format text,
  route text,
  eligibility text,
  primary key (competition_id, locale)
);

alter table public.competition_details enable row level security;
drop policy if exists "Signed-in users can view competition details" on public.competition_details;
create policy "Signed-in users can view competition details"
  on public.competition_details for select to authenticated using (true);
grant select on public.competition_details to authenticated;
grant all on public.competition_details to service_role;

-- --------------------------------------------------- problem levels ---
-- Which stage a problem was written for, and where a rewritten one came from.
alter table public.tasks
  add column if not exists level text
    check (level is null or level in ('oblast', 'republican', 'international')),
  add column if not exists derived_from text references public.tasks(id) on delete set null,
  -- The sitting a problem came from, for sitting a real paper whole.
  add column if not exists paper text;

create index if not exists tasks_level_idx on public.tasks(level) where level is not null;
create index if not exists tasks_derived_from_idx on public.tasks(derived_from) where derived_from is not null;
create index if not exists tasks_paper_idx on public.tasks(paper) where paper is not null;

-- ------------------------------------------------------------ telegram ---
-- The chat the evening check-in is asked through. Linked by a one-time code
-- in a deep link; the username typed at sign-up is the fallback.
alter table public.profiles
  add column if not exists telegram_username text,
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_linked_at timestamptz,
  add column if not exists telegram_link_code text;

create unique index if not exists profiles_telegram_username_key
  on public.profiles(lower(telegram_username)) where telegram_username is not null;
create unique index if not exists profiles_telegram_chat_id_key
  on public.profiles(telegram_chat_id) where telegram_chat_id is not null;
create unique index if not exists profiles_telegram_link_code_key
  on public.profiles(telegram_link_code) where telegram_link_code is not null;

-- The half-asked check-in. Written only by the webhook with the service role.
create table if not exists public.telegram_sessions (
  chat_id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 10),
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists telegram_sessions_user_idx on public.telegram_sessions(user_id);
alter table public.telegram_sessions enable row level security;
grant all on public.telegram_sessions to service_role;

-- ----------------------------------------------- subjects and sections ---
-- Two subjects for now, and a real syllabus inside each. Nothing is deleted:
-- a flag hides the other five, and flipping it back restores them whole.
alter table public.subjects add column if not exists active boolean not null default true;
update public.subjects set active = false
where slug in ('biology', 'computer-science', 'economics', 'geography', 'linguistics');

insert into public.topics (subject_id, name, slug)
select s.id, v.name, v.slug
from (values
  ('mathematics', 'Inequalities',             'inequalities'),
  ('mathematics', 'Polynomials',              'polynomials'),
  ('mathematics', 'Functional Equations',     'functional-equations'),
  ('mathematics', 'Sequences and Series',     'sequences'),
  ('mathematics', 'Graphs',                   'graphs'),
  ('mathematics', 'Invariants and Colourings','invariants'),
  ('mathematics', 'Games and Strategies',     'games'),
  ('physics',     'Kinematics',               'kinematics'),
  ('physics',     'Statics',                  'statics'),
  ('physics',     'Conservation Laws',        'conservation'),
  ('physics',     'Fluids and Gases',         'fluids'),
  ('physics',     'Molecular Physics',        'molecular'),
  ('physics',     'Electrostatics',           'electrostatics'),
  ('physics',     'Magnetism and Induction',  'magnetism')
) as v(subject_slug, name, slug)
join public.subjects s on s.slug = v.subject_slug
where not exists (select 1 from public.topics t where t.subject_id = s.id and t.slug = v.slug);

-- The order a syllabus is taught in, rather than the mean difficulty of
-- whatever happened to be imported.
alter table public.topics add column if not exists position smallint not null default 0;

update public.topics t set position = v.position
from (values
  ('algebra', 1), ('inequalities', 2), ('polynomials', 3), ('sequences', 4),
  ('functional-equations', 5), ('number-theory', 6), ('geometry', 7),
  ('combinatorics', 8), ('graphs', 9), ('invariants', 10), ('games', 11),
  ('kinematics', 1), ('mechanics', 2), ('statics', 3), ('conservation', 4),
  ('fluids', 5), ('oscillations-waves', 6), ('molecular', 7), ('thermodynamics', 8),
  ('electrostatics', 9), ('electrodynamics', 10), ('magnetism', 11),
  ('optics', 12), ('modern-physics', 13)
) as v(slug, position)
where t.slug = v.slug;
update public.topics set position = 90 where position = 0;
create index if not exists topics_order_idx on public.topics(subject_id, position);

-- ----------------------------------------------------- teachers, classes ---
-- A teacher watches rather than practises. What they may read is settled in
-- policies below, not in pages that could forget to filter.
alter table public.profiles
  add column if not exists role text not null default 'student' check (role in ('student', 'teacher'));

-- Six characters that survive being read aloud: no I, L, O, 0 or 1.
create or replace function public.gen_join_code()
returns text
language sql
volatile
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
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

-- Security definer, so a policy on one class table can ask about the other
-- without the two policies evaluating each other forever. Each answers a
-- question about the caller only.
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher');
$$;

create or replace function public.owns_class(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = target and c.teacher_id = auth.uid());
$$;

create or replace function public.in_class(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_members m where m.class_id = target and m.student_id = auth.uid());
$$;

create or replace function public.teaches(student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members m join public.classes c on c.id = m.class_id
    where m.student_id = student and c.teacher_id = auth.uid()
  );
$$;

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

drop policy if exists "Teacher and members can see a class" on public.classes;
create policy "Teacher and members can see a class"
  on public.classes for select to authenticated using (auth.uid() = teacher_id or public.in_class(id));
drop policy if exists "Teachers can open a class" on public.classes;
create policy "Teachers can open a class"
  on public.classes for insert to authenticated with check (auth.uid() = teacher_id and public.is_teacher());
drop policy if exists "Teachers can edit their class" on public.classes;
create policy "Teachers can edit their class"
  on public.classes for update to authenticated using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
drop policy if exists "Teachers can close their class" on public.classes;
create policy "Teachers can close their class"
  on public.classes for delete to authenticated using (auth.uid() = teacher_id);

drop policy if exists "Teacher and student can see the membership" on public.class_members;
create policy "Teacher and student can see the membership"
  on public.class_members for select to authenticated using (student_id = auth.uid() or public.owns_class(class_id));
-- No insert policy: joining is checked against the code and written with the
-- service role, so knowing a class id is not enough.
drop policy if exists "Leaving and removing" on public.class_members;
create policy "Leaving and removing"
  on public.class_members for delete to authenticated using (student_id = auth.uid() or public.owns_class(class_id));

-- A teacher reads their students' work: attempts, mastery, answers, reading
-- and papers. Not their days, their chats with Sulu or their own cards.
drop policy if exists "Teachers can see their students" on public.profiles;
create policy "Teachers can see their students" on public.profiles for select to authenticated using (public.teaches(id));
drop policy if exists "Teachers can see their students' attempts" on public.task_attempts;
create policy "Teachers can see their students' attempts" on public.task_attempts for select to authenticated using (public.teaches(user_id));
drop policy if exists "Teachers can see their students' mastery" on public.user_progress;
create policy "Teachers can see their students' mastery" on public.user_progress for select to authenticated using (public.teaches(user_id));
drop policy if exists "Teachers can see their students' answers" on public.quiz_attempts;
create policy "Teachers can see their students' answers" on public.quiz_attempts for select to authenticated using (public.teaches(user_id));
drop policy if exists "Teachers can see their students' reading" on public.lesson_views;
create policy "Teachers can see their students' reading" on public.lesson_views for select to authenticated using (public.teaches(user_id));
drop policy if exists "Teachers can see their students' papers" on public.mock_tests;
create policy "Teachers can see their students' papers" on public.mock_tests for select to authenticated using (public.teaches(user_id));

grant select, insert, update, delete on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant all on public.classes, public.class_members to service_role;

-- A class's own route: the order of its sections, how many problems each asks
-- for, which ones are skipped, by when, with a note, and the problems the
-- teacher chose. Sections the teacher never touched keep the default.
create table if not exists public.class_tracks (
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  position smallint not null check (position between 0 and 999),
  target smallint check (target between 0 and 500),
  skipped boolean not null default false,
  due_date date,
  note text check (note is null or length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (class_id, topic_id)
);
create index if not exists class_tracks_class_idx on public.class_tracks(class_id, position);

create table if not exists public.class_track_tasks (
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  position smallint not null check (position between 0 and 999),
  primary key (class_id, task_id)
);
create index if not exists class_track_tasks_order_idx on public.class_track_tasks(class_id, topic_id, position);

alter table public.class_tracks enable row level security;
alter table public.class_track_tasks enable row level security;

drop policy if exists "Teacher and students can read the track" on public.class_tracks;
create policy "Teacher and students can read the track"
  on public.class_tracks for select to authenticated using (public.owns_class(class_id) or public.in_class(class_id));
drop policy if exists "Teachers set their class's track" on public.class_tracks;
create policy "Teachers set their class's track"
  on public.class_tracks for insert to authenticated with check (public.owns_class(class_id));
drop policy if exists "Teachers change their class's track" on public.class_tracks;
create policy "Teachers change their class's track"
  on public.class_tracks for update to authenticated using (public.owns_class(class_id)) with check (public.owns_class(class_id));
drop policy if exists "Teachers clear their class's track" on public.class_tracks;
create policy "Teachers clear their class's track"
  on public.class_tracks for delete to authenticated using (public.owns_class(class_id));

drop policy if exists "Teacher and students can read chosen problems" on public.class_track_tasks;
create policy "Teacher and students can read chosen problems"
  on public.class_track_tasks for select to authenticated using (public.owns_class(class_id) or public.in_class(class_id));
drop policy if exists "Teachers choose their class's problems" on public.class_track_tasks;
create policy "Teachers choose their class's problems"
  on public.class_track_tasks for insert to authenticated with check (public.owns_class(class_id));
drop policy if exists "Teachers change their class's problems" on public.class_track_tasks;
create policy "Teachers change their class's problems"
  on public.class_track_tasks for update to authenticated using (public.owns_class(class_id)) with check (public.owns_class(class_id));
drop policy if exists "Teachers clear their class's problems" on public.class_track_tasks;
create policy "Teachers clear their class's problems"
  on public.class_track_tasks for delete to authenticated using (public.owns_class(class_id));

grant select, insert, update, delete on public.class_tracks, public.class_track_tasks to authenticated;
grant all on public.class_tracks, public.class_track_tasks to service_role;

-- Saving a plan replaces it in one transaction, as the teacher, so the
-- policies above decide what it may touch.
create or replace function public.save_class_plan(plan_class uuid, sections jsonb, chosen jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.owns_class(plan_class) then
    raise exception 'not your class' using errcode = '42501';
  end if;
  delete from public.class_track_tasks where class_id = plan_class;
  delete from public.class_tracks where class_id = plan_class;
  insert into public.class_tracks (class_id, topic_id, position, target, skipped, due_date, note)
  select plan_class, s.topic_id, s.position, s.target, coalesce(s.skipped, false), s.due_date, s.note
  from jsonb_to_recordset(coalesce(sections, '[]'::jsonb))
    as s(topic_id uuid, position smallint, target smallint, skipped boolean, due_date date, note text);
  insert into public.class_track_tasks (class_id, topic_id, task_id, position)
  select plan_class, c.topic_id, c.task_id, c.position
  from jsonb_to_recordset(coalesce(chosen, '[]'::jsonb))
    as c(topic_id uuid, task_id text, position smallint);
end;
$$;
revoke all on function public.save_class_plan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_class_plan(uuid, jsonb, jsonb) to authenticated;

-- A class's own problems are rows in `tasks` with the class on them, so they
-- are graded like any other; only the class sees them.
alter table public.tasks
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists tasks_class_idx on public.tasks(class_id) where class_id is not null;

grant select (level, derived_from, paper, class_id, grade_min, grade_max) on public.tasks to authenticated;

drop policy if exists "Signed-in users can view tasks" on public.tasks;
create policy "Signed-in users can view tasks"
  on public.tasks for select to authenticated
  using (class_id is null or public.owns_class(class_id) or public.in_class(class_id));

-- Files a teacher hands out. The bytes are on the server's disk
-- (lib/class-files.ts); this table is the list, and reading it is the check.
create table if not exists public.class_files (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  path text not null unique,
  name text not null check (length(btrim(name)) between 1 and 200),
  size integer not null check (size between 1 and 20971520),
  mime text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists class_files_class_idx on public.class_files(class_id, created_at desc);
alter table public.class_files enable row level security;
drop policy if exists "Teacher and students can see the files" on public.class_files;
create policy "Teacher and students can see the files"
  on public.class_files for select to authenticated using (public.owns_class(class_id) or public.in_class(class_id));
drop policy if exists "Teachers add files" on public.class_files;
create policy "Teachers add files"
  on public.class_files for insert to authenticated with check (public.owns_class(class_id) and uploaded_by = auth.uid());
drop policy if exists "Teachers remove files" on public.class_files;
create policy "Teachers remove files"
  on public.class_files for delete to authenticated using (public.owns_class(class_id));
grant select, insert, delete on public.class_files to authenticated;
grant all on public.class_files to service_role;

-- New accounts: the role and the Telegram username from the sign-up form; a
-- teacher skips the student's onboarding questions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text := case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end;
begin
  insert into public.profiles (id, full_name, telegram_username, role, onboarding_completed_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(lower(ltrim(new.raw_user_meta_data ->> 'telegram_username', '@')), ''),
    new_role,
    case when new_role = 'teacher' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- The profile columns that are the server's to set, never a student's own
-- session: the role and the Telegram link. (is_admin has its own guard.)
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.role is distinct from old.role
      or new.telegram_chat_id is distinct from old.telegram_chat_id
      or new.telegram_linked_at is distinct from old.telegram_linked_at
      or new.telegram_link_code is distinct from old.telegram_link_code
    then
      raise exception 'these profile fields are set by the server' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ---------------------------------------------------------------- tour ---
-- When the guided tour was finished or closed; null means never shown.
alter table public.profiles add column if not exists tour_completed_at timestamptz;

-- --------------------------------------------------------------- flame ---
-- One row per calendar day the app was opened: the streak counts coming back.
create table if not exists public.daily_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_visits enable row level security;
drop policy if exists "Users read their own visits" on public.daily_visits;
create policy "Users read their own visits"
  on public.daily_visits for select to authenticated using (auth.uid() = user_id);
-- Only today, give or take the time zones; never a past month backfilled.
drop policy if exists "Users record their own visits" on public.daily_visits;
create policy "Users record their own visits"
  on public.daily_visits for insert to authenticated
  with check (
    auth.uid() = user_id
    and day between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date + 1
  );
grant select, insert on public.daily_visits to authenticated;

-- The current run and the longest, as gaps-and-islands over the days.
create or replace function public.visit_streak(today date)
returns table (current_streak int, best_streak int, last_day date)
language sql
stable
security invoker
set search_path = public
as $$
  with days as (select day from public.daily_visits where user_id = auth.uid()),
  grouped as (select day, day - (row_number() over (order by day))::int as run from days),
  runs as (select max(day) as ends, count(*)::int as length from grouped group by run)
  select
    coalesce((select length from runs where ends >= today - 1 order by ends desc limit 1), 0),
    coalesce((select max(length) from runs), 0),
    (select max(day) from days);
$$;
grant execute on function public.visit_streak(date) to authenticated;

-- ------------------------------------------------------------ protocol ---
-- Points out of seven, the jury's sentence, marks on the lines, the scheme
-- and the first break. Attempts graded before this keep their paragraph.
alter table public.task_attempts
  add column if not exists points smallint check (points between 0 and 7),
  add column if not exists summary text,
  add column if not exists marks jsonb,
  add column if not exists criteria jsonb,
  add column if not exists break_point jsonb;
