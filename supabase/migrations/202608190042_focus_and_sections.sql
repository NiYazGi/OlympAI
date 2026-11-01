-- Two subjects for now, and a real syllabus inside each.
--
-- Nothing is deleted. The other five subjects carry three topics, three
-- lessons and a couple of problems each — small, but somebody wrote them, and
-- "for now" is a word that means this comes back. A flag hides them from every
-- read; flipping it back restores the subject whole.
alter table public.subjects
  add column if not exists active boolean not null default true;

update public.subjects
set active = false
where slug in ('biology', 'computer-science', 'economics', 'geography', 'linguistics');

-- ------------------------------------------------------------- the syllabus ---
-- The existing topics stay: Algebra, Combinatorics, Number Theory, Geometry,
-- Mechanics, Thermodynamics, Electrodynamics, Optics and Modern Physics are
-- all real sections and they carry the lessons, questions and cards that have
-- been written so far. What was missing is everything between them — an
-- olympiad syllabus is not four headings, and filing a functional equation
-- under "Algebra" tells a student nothing about what to practise.
--
-- A new section has no lesson and no questions yet, and says so. That is the
-- honest state: the gap is now visible instead of hidden inside a heading
-- broad enough to swallow it.
insert into public.topics (subject_id, name, slug)
select s.id, v.name, v.slug
from (values
  -- Mathematics
  ('mathematics', 'Inequalities',             'inequalities'),
  ('mathematics', 'Polynomials',              'polynomials'),
  ('mathematics', 'Functional Equations',     'functional-equations'),
  ('mathematics', 'Sequences and Series',     'sequences'),
  ('mathematics', 'Graphs',                   'graphs'),
  ('mathematics', 'Invariants and Colourings','invariants'),
  ('mathematics', 'Games and Strategies',     'games'),
  -- Physics
  ('physics',     'Kinematics',               'kinematics'),
  ('physics',     'Statics',                  'statics'),
  ('physics',     'Conservation Laws',        'conservation'),
  ('physics',     'Fluids and Gases',         'fluids'),
  ('physics',     'Oscillations and Waves',   'waves'),
  ('physics',     'Molecular Physics',        'molecular'),
  ('physics',     'Electrostatics',           'electrostatics'),
  ('physics',     'Magnetism and Induction',  'magnetism')
) as v(subject_slug, name, slug)
join public.subjects s on s.slug = v.subject_slug
where not exists (
  select 1 from public.topics t where t.subject_id = s.id and t.slug = v.slug
);
