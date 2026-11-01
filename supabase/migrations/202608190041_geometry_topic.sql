-- Geometry, which olympiad mathematics cannot do without.
--
-- The subject had algebra, combinatorics and number theory. A quarter of any
-- olympiad paper is geometry, so without this every one of those problems
-- would have to be filed under a topic it is not about — and the topic is what
-- the ladder, the recommender and the skills radar all read.
insert into public.topics (subject_id, name, slug)
select s.id, 'Geometry', 'geometry'
from public.subjects s
where s.slug = 'mathematics'
  and not exists (
    select 1 from public.topics t where t.subject_id = s.id and t.slug = 'geometry'
  );
