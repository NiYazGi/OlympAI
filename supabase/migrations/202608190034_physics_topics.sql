-- Physics topics for the olympiad archive.
--
-- The library had Mechanics, Thermodynamics and Electrodynamics. Olympiad
-- papers also set optics, oscillation and wave problems, and atomic, nuclear
-- and astrophysics questions; filing them under the three existing topics
-- would make each of those mean less.

insert into public.topics (subject_id, name, slug)
select s.id, v.name, v.slug
from public.subjects s
cross join (values
  ('Optics', 'optics'),
  ('Oscillations and Waves', 'oscillations-waves'),
  ('Modern Physics', 'modern-physics')
) as v(name, slug)
where s.slug = 'physics'
on conflict (subject_id, slug) do nothing;
