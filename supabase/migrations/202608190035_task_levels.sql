-- Which stage a problem belongs to, and where a derived one came from.
--
-- A student preparing for the oblast round and a student preparing for the
-- IPhO need different problems, and until now the only ordering the catalogue
-- had was `difficulty`, which is a 1–5 guess about one problem rather than a
-- statement about which paper it was written for. Two problems can both be
-- "4 stars" and belong to completely different rooms.
--
-- Three values, because that is the ladder a student in Kazakhstan actually
-- climbs: the oblast round, the republican round, then an international paper.
-- A problem with no level is one nobody has classified yet, which is a real
-- state and not a default.
alter table public.tasks
  add column if not exists level text
    check (level is null or level in ('oblast', 'republican', 'international'));

create index if not exists tasks_level_idx on public.tasks(level) where level is not null;

-- Where a rewritten problem came from.
--
-- An oblast-level problem may be built from a harder one: the same physical
-- situation, restated in the author's own words, with different numbers and an
-- answer recomputed in code. That is a derivative work, so it inherits its
-- parent's terms, and the only way to keep track of which terms is to keep
-- track of the parent. `on delete set null` rather than cascade: losing the
-- source should not silently delete work built on it.
alter table public.tasks
  add column if not exists derived_from text
    references public.tasks(id) on delete set null;

create index if not exists tasks_derived_from_idx
  on public.tasks(derived_from) where derived_from is not null;

-- The two physics topics the existing three do not cover.
--
-- The catalogue has Mechanics, Thermodynamics and Electrodynamics. An IPhO
-- paper is roughly a quarter optics and modern physics, and without these two
-- those problems would have to be filed under a topic they are not about.
insert into public.topics (subject_id, name, slug)
select s.id, v.name, v.slug
from (values
  ('Optics', 'optics'),
  ('Modern Physics', 'modern-physics')
) as v(name, slug)
join public.subjects s on s.slug = 'physics'
where not exists (
  select 1 from public.topics t where t.subject_id = s.id and t.slug = v.slug
);
