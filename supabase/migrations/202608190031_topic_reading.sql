-- Somewhere to go after the lesson.
--
-- Every topic has one lesson written for this project, which is enough to get
-- the idea and not enough to learn a subject from. This attaches the standard
-- open reference for each subject to each of its topics, so the topic page can
-- end with "and here is the rest of it" instead of ending.
--
-- The list is the short one from docs/content-sources.md: only sources whose
-- own licence permits this use. Everything else in that document is free to
-- read on its owner's site and not ours to republish or recommend as our own
-- material — a link is cheap, a licence is not — so geography and linguistics
-- get nothing here rather than getting something we cannot stand behind. When
-- an olympiad-level open source appears for them, it goes in the same way.
--
-- Levels are stated in the description on purpose. OpenStax is a first-year
-- university text, not an olympiad book, and a student who finds that out
-- three chapters in has been misled by us rather than by OpenStax.

insert into public.resources (topic_id, kind, title, url, description, licence, attribution, position)
select
  t.id,
  'reference',
  source.title,
  source.url,
  source.description,
  source.licence::public.content_licence,
  source.attribution,
  source.position
from public.topics t
join public.subjects s on s.id = t.subject_id
join (
  values
    ('physics', 'OpenStax — University Physics',
     'https://openstax.org/details/books/university-physics-volume-1',
     'The standard free treatment of the underlying theory, with worked examples and end-of-chapter problems. University first-year level rather than olympiad level: use it to fill a gap, not to train.',
     'cc-by', 'OpenStax, CC BY 4.0', 0),

    ('biology', 'OpenStax — Biology 2e',
     'https://openstax.org/details/books/biology-2e',
     'A complete introductory biology text. Covers the ground IBO theory papers assume you already have.',
     'cc-by', 'OpenStax, CC BY 4.0', 0),

    ('economics', 'OpenStax — Principles of Economics 3e',
     'https://openstax.org/details/books/principles-economics-3e',
     'Micro and macro from the beginning, with the diagrams IEO papers expect you to read without hesitating.',
     'cc-by', 'OpenStax, CC BY 4.0', 0),

    ('mathematics', 'OpenStax — Algebra and Trigonometry 2e',
     'https://openstax.org/details/books/algebra-and-trigonometry-2e',
     'The technique underneath olympiad problems: identities, inequalities, functions. Not a problem book — the problems here are exercises, and the difference matters.',
     'cc-by', 'OpenStax, CC BY 4.0', 0),

    ('mathematics', 'Project Euler',
     'https://projecteuler.net/archives',
     'Number theory and combinatorics as programming problems. Non-commercial licence, which this app currently satisfies.',
     'cc-by-nc', 'Project Euler, CC BY-NC-SA 4.0', 1),

    ('computer-science', 'cp-algorithms',
     'https://cp-algorithms.com/',
     'The reference for the algorithms IOI problems are built from, each with an implementation and the reasoning for it.',
     'cc-by-sa', 'cp-algorithms contributors, CC BY-SA 4.0', 0),

    ('computer-science', 'Project Euler',
     'https://projecteuler.net/archives',
     'Eight hundred problems that reward a better algorithm rather than a faster machine.',
     'cc-by-nc', 'Project Euler, CC BY-NC-SA 4.0', 1)
) as source(subject_slug, title, url, description, licence, attribution, position)
  on source.subject_slug = s.slug
where not exists (
  select 1 from public.resources r where r.topic_id = t.id and r.url = source.url
);
