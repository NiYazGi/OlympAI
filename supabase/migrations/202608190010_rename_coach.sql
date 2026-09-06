-- The coach is called Newton AI.
--
-- The old name is baked into a column default from the initial migration. That
-- migration has already run everywhere, so it is left untouched — rewriting an
-- applied migration makes the file disagree with the database it produced.
alter table public.chat_sessions
  alter column title set default 'New Newton AI session';

-- Sessions that were auto-titled before the rename. Titles derived from the
-- student's first message are left alone.
update public.chat_sessions
set title = 'New Newton AI session'
where title = 'New Sulu AI session';
