-- Pick an olympiad, set your own deadline.
--
-- The competitions table shipped empty on purpose: inventing competition dates
-- is the one kind of filler a student could act on and be harmed by. Names are
-- different — "International Mathematical Olympiad" is a fact, and a stable
-- one. So the catalogue carries names, subjects and levels, and the date comes
-- from the student, who knows which sitting they are aiming at.

-- Catalogue rows have no fixed date; a student's own target date lives on the
-- profile. Editions with a known date can still be added on top.
alter table public.competitions
  alter column starts_on drop not null;

alter table public.profiles
  add column if not exists target_competition_id uuid
    references public.competitions(id) on delete set null;

-- A student may also aim at something not in the catalogue.
alter table public.competitions
  add column if not exists slug text unique,
  add column if not exists created_by uuid references auth.users(id) on delete cascade;

create index if not exists competitions_subject_idx on public.competitions(subject_id);

-- Anyone signed in may add a competition; only the author can change or remove
-- one, and catalogue rows (created_by is null) are read-only to everyone.
drop policy if exists "Users can add competitions" on public.competitions;
create policy "Users can add competitions"
  on public.competitions for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Authors can edit their competitions" on public.competitions;
create policy "Authors can edit their competitions"
  on public.competitions for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Authors can remove their competitions" on public.competitions;
create policy "Authors can remove their competitions"
  on public.competitions for delete using (auth.uid() = created_by);

-- Real, long-running competitions. No dates: those move every year and belong
-- to the official site, not to this table.
insert into public.competitions (slug, name, subject_id, level, registration_url)
select v.slug, v.name, s.id, v.level, v.url
from (values
  ('imo',  'International Mathematical Olympiad (IMO)',  'mathematics',   'International', 'https://www.imo-official.org/'),
  ('apmo', 'Asian Pacific Mathematics Olympiad (APMO)',  'mathematics',   'International', null),
  ('egmo', 'European Girls'' Mathematical Olympiad',     'mathematics',   'International', 'https://www.egmo.org/'),
  ('ipho', 'International Physics Olympiad (IPhO)',      'physics',       'International', 'https://ipho-unofficial.org/'),
  ('apho', 'Asian Physics Olympiad (APhO)',              'physics',       'International', null),
  ('ioi',  'International Olympiad in Informatics (IOI)','computer-science','International','https://ioinformatics.org/'),
  ('ibo',  'International Biology Olympiad (IBO)',       'biology',       'International', 'https://www.ibo-info.org/'),
  ('igeo', 'International Geography Olympiad (iGeo)',    'geography',     'International', 'https://www.geoolympiad.org/'),
  ('ieo',  'International Economics Olympiad (IEO)',     'economics',     'International', 'https://ecolymp.org/'),
  ('iol',  'International Linguistics Olympiad (IOL)',   'linguistics',   'International', 'https://ioling.org/')
) as v(slug, name, subject_slug, level, url)
join public.subjects s on s.slug = v.subject_slug
on conflict (slug) do update set
  name = excluded.name, subject_id = excluded.subject_id,
  level = excluded.level, registration_url = excluded.registration_url;

-- Generic targets, for students aiming at a stage rather than a named contest.
insert into public.competitions (slug, name, subject_id, level)
select v.slug, v.name, null::uuid, v.level
from (values
  ('school-round',   'School round',              'School'),
  ('regional-round', 'Regional round',            'Regional'),
  ('national-round', 'National olympiad',         'National'),
  ('national-team',  'National team selection',   'National')
) as v(slug, name, level)
on conflict (slug) do update set name = excluded.name, level = excluded.level;
