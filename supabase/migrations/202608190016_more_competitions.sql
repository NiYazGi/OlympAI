-- A wider catalogue.
--
-- Same rule as before: only competitions that genuinely exist and run
-- regularly, and no dates. Sittings move every year, so the official page is
-- the only trustworthy source and the student supplies their own target date.

insert into public.competitions (slug, name, subject_id, level, registration_url)
select v.slug, v.name, s.id, v.level, v.url
from (values
  -- Mathematics
  ('bmo',        'Balkan Mathematical Olympiad',                    'mathematics',     'International', null),
  ('jbmo',       'Junior Balkan Mathematical Olympiad',             'mathematics',     'International', null),
  ('ibero-math', 'Iberoamerican Mathematical Olympiad',             'mathematics',     'International', null),
  ('rmm',        'Romanian Master of Mathematics',                  'mathematics',     'International', 'https://rmms.lbi.ro/'),
  ('tot',        'Tournament of Towns',                             'mathematics',     'International', null),
  ('pamo',       'Pan-African Mathematics Olympiad',                'mathematics',     'International', null),
  ('cono-sur',   'Cono Sur Mathematical Olympiad',                  'mathematics',     'International', null),
  ('imc',        'International Mathematics Competition (IMC)',     'mathematics',     'University',    'https://www.imc-math.org.uk/'),
  -- Physics
  ('eupho',      'European Physics Olympiad (EuPhO)',               'physics',         'International', 'https://eupho.ee/'),
  ('ioaa',       'Olympiad on Astronomy and Astrophysics (IOAA)',   'physics',         'International', null),
  ('nbpho',      'Nordic-Baltic Physics Olympiad',                  'physics',         'International', null),
  -- Informatics
  ('ceoi',       'Central European Olympiad in Informatics (CEOI)', 'computer-science','International', null),
  ('boi',        'Balkan Olympiad in Informatics (BOI)',            'computer-science','International', null),
  ('egoi',       'European Girls'' Olympiad in Informatics (EGOI)', 'computer-science','International', 'https://egoi.org/'),
  ('icpc',       'International Collegiate Programming Contest',    'computer-science','University',    'https://icpc.global/'),
  -- Linguistics
  ('naclo',      'North American Computational Linguistics Open',   'linguistics',     'National',      'https://naclo.org/'),
  ('plo',        'Panini Linguistics Olympiad',                     'linguistics',     'National',      null)
) as v(slug, name, subject_slug, level, url)
join public.subjects s on s.slug = v.subject_slug
on conflict (slug) do update set
  name = excluded.name, subject_id = excluded.subject_id,
  level = excluded.level, registration_url = excluded.registration_url;

-- Multi-subject competitions carry no subject of their own: the student picks
-- which one they are training in, the same way the generic rounds work.
insert into public.competitions (slug, name, subject_id, level, registration_url)
select v.slug, v.name, null::uuid, v.level, v.url
from (values
  ('ijso', 'International Junior Science Olympiad (IJSO)', 'International', null),
  ('euso', 'European Union Science Olympiad (EUSO)',       'International', null),
  ('city-round', 'City round',                             'Regional',      null)
) as v(slug, name, level, url)
on conflict (slug) do update set
  name = excluded.name, level = excluded.level, registration_url = excluded.registration_url;
