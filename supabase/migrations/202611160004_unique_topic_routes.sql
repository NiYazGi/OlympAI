-- /learn/[topic] identifies a topic by its slug, without a subject segment.
-- The Informatics import reused Mathematics slugs, so a Mathematics
-- lesson could resolve to an Informatics topic with no lesson and return 404.
-- Keep all topic IDs (and therefore task, lesson and progress links) intact.
update public.topics t
set slug = 'informatics-' || t.slug
from public.subjects s
where t.subject_id = s.id
  and s.slug = 'informatics'
  and exists (
    select 1 from public.topics other
    where other.slug = t.slug and other.subject_id <> t.subject_id
  );

-- Topic routes must remain unambiguous when future subjects are imported.
create unique index if not exists topics_route_slug_unique
  on public.topics (slug);
