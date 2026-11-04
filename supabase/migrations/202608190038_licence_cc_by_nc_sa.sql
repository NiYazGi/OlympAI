-- The licence most open textbook projects publish under: non-commercial and
-- share-alike together. From the original project's redesign branch
-- (its migration 36), renumbered here.
--
-- Alone in this file: Postgres will not let a new enum value be used in the
-- transaction that created it, and the runner wraps each file in one.
alter type public.content_licence add value if not exists 'cc-by-nc-sa';
