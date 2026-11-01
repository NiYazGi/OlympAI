-- Which sitting a problem came from.
--
-- A mock test has been a paper the app composed: five problems picked across
-- the difficulty range, which is a reasonable imitation and is still only an
-- imitation. Fifteen real sittings are now in the library — the oblast and
-- republican rounds of 2021–2026, four problems and four hours each, exactly
-- as they were written — and a student can sit one of those instead.
--
-- The column is what makes them findable. The ids already encode it, but an
-- id is a name, not a field, and parsing one in a query is how a rename turns
-- into a silent empty list.
alter table public.tasks
  add column if not exists paper text;

-- Backfill from the ids the two daryn importers wrote. Everything up to the
-- final segment is the sitting; the last segment is the problem within it.
update public.tasks
set paper = regexp_replace(id, '-[0-9]{1,2}[A-ZА-Я]?$', '')
where (id like 'daryn-phys-%' or id like 'zhmb-phys-%')
  and paper is null;

create index if not exists tasks_paper_idx on public.tasks(paper) where paper is not null;
