-- A class's own material: problems the teacher wrote and files they hand out.
--
-- Until now a teacher could only arrange the library — reorder sections, pick
-- which of its problems a class does. The problem they set on Friday from their
-- own notebook, and the PDF of last year's school round, had nowhere to go.
--
-- Problems go into `tasks` rather than a table of their own, because a problem
-- a student solves has to be graded, and grading, attempts and protocols are
-- all keyed to a task. What makes one a class problem is `class_id`: the shared
-- catalogue leaves those rows out, and only the class sees them.

-- ------------------------------------------------------------ problems ---
alter table public.tasks
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  -- Who wrote it, for the class page; the class is what decides who sees it.
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists tasks_class_idx on public.tasks(class_id) where class_id is not null;

-- Column grants are explicit since migration 22: a new column is invisible to
-- the browser's role until it is named here.
grant select (class_id) on public.tasks to authenticated;

-- Every signed-in user could read every task. A class's own problems are for
-- that class: its teacher and its students.
drop policy if exists "Signed-in users can view tasks" on public.tasks;
create policy "Signed-in users can view tasks"
  on public.tasks for select to authenticated
  using (class_id is null or public.owns_class(class_id) or public.in_class(class_id));

-- Writes go through the server with the service role, after it has checked the
-- teacher owns the class, the same way grades are written. No insert policy
-- for `authenticated`: a browser cannot put a row into the shared catalogue.

-- --------------------------------------------------------------- files ---
-- The bytes live in a private storage bucket that only the service role
-- touches; this table is the list a class sees, and reading it is the check.
-- A download link is signed on the server for whoever could read the row.
insert into storage.buckets (id, name, public, file_size_limit)
values ('class-files', 'class-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create table if not exists public.class_files (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  -- `<class id>/<random>-<name>` inside the bucket.
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
  on public.class_files for select to authenticated
  using (public.owns_class(class_id) or public.in_class(class_id));

drop policy if exists "Teachers add files" on public.class_files;
create policy "Teachers add files"
  on public.class_files for insert to authenticated
  with check (public.owns_class(class_id) and uploaded_by = auth.uid());

drop policy if exists "Teachers remove files" on public.class_files;
create policy "Teachers remove files"
  on public.class_files for delete to authenticated
  using (public.owns_class(class_id));

grant select, insert, delete on public.class_files to authenticated;

-- ------------------------------------------------------------ olympiads ---
-- Four mathematics olympiads Kazakh students sit or train on, added on
-- 1 November 2026. Facts are from the sources named beside each; what could
-- not be checked is left out, and dates are never stored (see migration 46).

-- APMO was already in the catalogue, hidden with the rest of the
-- non-Kazakh list. Kazakhstan takes part, so it comes back, under its Russian
-- name. Checked: apmo-official.org and its regulations — one paper, five
-- problems, four hours, 7 points each; under 20 on 1 July and not enrolled at
-- a university.
update public.competitions set
  name = 'Азиатско-Тихоокеанская математическая олимпиада (APMO)',
  level = 'International',
  region = 'Asia-Pacific',
  founded = 1989,
  official_url = 'https://apmo-official.org/',
  active = true
where slug = 'apmo';

-- The Iranian Geometry Olympiad: geometry only, by levels. Checked against the
-- problem booklets, which name igo-official.com as the official site, and a
-- 2024 report: five problems; four hours at the elementary level and four and
-- a half at the others.
--
-- The Euler olympiad: the Russian olympiad for 8th grade, held alongside the
-- All-Russian one (regional and final stages). Its official site could not be
-- confirmed, so it carries none rather than an aggregator's.
--
-- Silk Road: an international olympiad for the countries along the Silk Road,
-- coordinated in Kazakhstan; the 2026 international stage was in Astana. No
-- official site could be confirmed.
insert into public.competitions (slug, name, subject_id, level, region, founded, official_url, papers_url, active)
select v.slug, v.name, s.id, v.level, v.region, v.founded, v.official_url, v.papers_url, true
from (values
  ('igo', 'Иранская олимпиада по геометрии (IGO)', 'International', 'World', null::int,
   'https://igo-official.com/', 'https://igo-official.com/'),
  ('euler', 'Олимпиада им. Леонарда Эйлера', 'National', 'Russia', null::int, null, null),
  ('silk-road', 'Математическая олимпиада «Шёлковый путь»', 'International', 'Silk Road', null::int, null, null)
) as v(slug, name, level, region, founded, official_url, papers_url)
join public.subjects s on s.slug = 'mathematics'
on conflict (slug) do update set
  name = excluded.name, subject_id = excluded.subject_id, level = excluded.level,
  region = excluded.region, founded = excluded.founded,
  official_url = excluded.official_url, papers_url = excluded.papers_url, active = true;

delete from public.competition_details
where competition_id in (select id from public.competitions where slug in ('apmo', 'igo', 'euler', 'silk-road'));

insert into public.competition_details (competition_id, locale, summary, format, route, eligibility)
select c.id, v.locale, v.summary, v.format, v.route, v.eligibility
from (values
  ('apmo', 'ru',
   'Азиатско-Тихоокеанская математическая олимпиада проводится с 1989 года. Каждая страна пишет её у себя, а работы проверяет и награды определяет общий комитет.',
   'Одна работа: пять задач на доказательство, четыре часа, по 7 баллов за задачу.',
   'Участвуют по отбору своей страны; Казахстан среди стран-участниц.',
   'Младше 20 лет на 1 июля года олимпиады и ещё не поступившие в университет.'),
  ('apmo', 'en',
   'The Asian Pacific Mathematics Olympiad, held since 1989. Each country sits it at home; a central committee marks and decides the awards.',
   'One paper: five proof problems in four hours, 7 points each.',
   'Through each country''s own selection; Kazakhstan takes part.',
   'Under 20 on 1 July of the contest year and not yet enrolled at a university.'),
  ('igo', 'ru',
   'Иранская олимпиада по геометрии — международная олимпиада только по геометрии, по уровням для разных классов.',
   'Пять задач. На начальном уровне четыре часа, на остальных — четыре с половиной.',
   'Участвуют команды стран и школ; условия и решения публикуются на официальном сайте.',
   'Уровни по классам: начальный (7–8), средний (9–10), продвинутый (11–12); в последние годы есть и свободный уровень.'),
  ('igo', 'en',
   'The Iranian Geometry Olympiad: an international olympiad in geometry alone, set at levels by grade.',
   'Five problems. Four hours at the elementary level, four and a half at the others.',
   'Country and school teams take part; papers and solutions are published on the official site.',
   'Levels by grade: elementary (7–8), intermediate (9–10), advanced (11–12); recent years add a free level.'),
  ('euler', 'ru',
   'Олимпиада имени Леонарда Эйлера — российская олимпиада по математике для 8 класса, которая идёт параллельно со Всероссийской олимпиадой.',
   'Письменные работы на доказательство; региональный и заключительный этапы.',
   'Региональный этап проходит одновременно с региональным этапом Всероссийской олимпиады, лучшие едут на заключительный.',
   'Учащиеся 8 класса.'),
  ('euler', 'en',
   'The Leonhard Euler Olympiad: a Russian mathematics olympiad for 8th grade, run alongside the All-Russian olympiad.',
   'Written proof papers; a regional stage and a final.',
   'The regional stage runs at the same time as the All-Russian regional stage; the best go on to the final.',
   'Students in grade 8.'),
  ('silk-road', 'ru',
   'Международная математическая олимпиада «Шёлковый путь» для стран вдоль Великого шёлкового пути. Казахстан — одна из стран-координаторов; международный этап 2026 года прошёл в Астане.',
   'Формат работы организаторы объявляют каждый год; проверенных сведений о числе задач и времени здесь нет.',
   'Участвуют команды стран; в 2024 году в алматинском этапе участвовали 155 школьников из Казахстана.',
   'Школьники стран-участниц.'),
  ('silk-road', 'en',
   'The Silk Road Mathematical Olympiad, for the countries along the Silk Road. Kazakhstan is one of its coordinators; the 2026 international stage was in Astana.',
   'The organisers announce the format each year; the number of problems and the time are not stated here because they could not be checked.',
   'Country teams take part; 155 students from Kazakhstan sat the 2024 Almaty stage.',
   'School students from the participating countries.')
) as v(slug, locale, summary, format, route, eligibility)
join public.competitions c on c.slug = v.slug;
