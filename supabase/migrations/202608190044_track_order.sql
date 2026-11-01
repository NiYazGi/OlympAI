-- The order problems are met in, and how many of each topic to solve.
--
-- Until now a route through a subject was sorted by the mean difficulty of
-- each topic's problems. That was defensible when the library was 23 problems
-- written for this project and no one had typed out a syllabus; it is not
-- defensible now. Mean difficulty puts Invariants and Colourings before
-- Geometry because fourteen problems happen to average 2.79, and it reorders
-- the whole subject the day an import lands.
--
-- A syllabus is a human decision. So the order is a column, with the sequence
-- a physics course actually follows — kinematics before dynamics before
-- fields — and a teacher may replace it for their own class.

alter table public.topics
  add column if not exists position smallint not null default 0;

-- ---------------------------------------------------------- the default ---
update public.topics t set position = v.position
from (values
  -- Mathematics: algebra and its branches, then number theory, then geometry,
  -- then the combinatorial half. The order olympiad courses are taught in.
  ('algebra', 1), ('inequalities', 2), ('polynomials', 3), ('sequences', 4),
  ('functional-equations', 5), ('number-theory', 6), ('geometry', 7),
  ('combinatorics', 8), ('graphs', 9), ('invariants', 10), ('games', 11),
  -- Physics: mechanics forward, because every later section borrows from it.
  ('kinematics', 1), ('mechanics', 2), ('statics', 3), ('conservation', 4),
  ('fluids', 5), ('waves', 6), ('molecular', 7), ('thermodynamics', 8),
  ('electrostatics', 9), ('electrodynamics', 10), ('magnetism', 11),
  ('optics', 12), ('modern-physics', 13)
) as v(slug, position)
where t.slug = v.slug;

-- Anything not named above sorts after what is, in its own name's order,
-- rather than silently sharing first place.
update public.topics set position = 90 where position = 0;

create index if not exists topics_order_idx on public.topics(subject_id, position);

-- ------------------------------------------------------ the class's own ---
-- A teacher's order for their class, and how many problems a topic asks for.
--
-- `target` is the number that makes a route a route. Algebra holds 659
-- problems; a track that says "clear algebra" is a track nobody finishes and
-- a student who never reaches geometry. Null means the subject's default,
-- which is a handful rather than all of them.
--
-- A row per topic the teacher has touched. Topics with no row keep the default
-- order and the default target, so a teacher who moves one section has not
-- silently taken responsibility for the other twelve.
create table if not exists public.class_tracks (
  class_id uuid not null references public.classes(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  position smallint not null check (position between 0 and 999),
  target smallint check (target between 0 and 500),
  updated_at timestamptz not null default now(),
  primary key (class_id, topic_id)
);

create index if not exists class_tracks_class_idx on public.class_tracks(class_id, position);

alter table public.class_tracks enable row level security;

-- The same two questions as everywhere else in the class schema, answered by
-- the security-definer helpers from migration 43 so a policy never reads the
-- table it is protecting.
drop policy if exists "Teacher and students can read the track" on public.class_tracks;
create policy "Teacher and students can read the track"
  on public.class_tracks for select to authenticated
  using (public.owns_class(class_id) or public.in_class(class_id));

drop policy if exists "Teachers set their class's track" on public.class_tracks;
create policy "Teachers set their class's track"
  on public.class_tracks for insert to authenticated
  with check (public.owns_class(class_id));

drop policy if exists "Teachers change their class's track" on public.class_tracks;
create policy "Teachers change their class's track"
  on public.class_tracks for update to authenticated
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));

drop policy if exists "Teachers clear their class's track" on public.class_tracks;
create policy "Teachers clear their class's track"
  on public.class_tracks for delete to authenticated
  using (public.owns_class(class_id));
