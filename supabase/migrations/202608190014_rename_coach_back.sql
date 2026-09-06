-- The coach is called Sulu AI again.
--
-- Migration 0010 renamed it to Newton and has already run, so it is left
-- untouched: rewriting an applied migration makes the file disagree with the
-- database it produced. This one reverses it forward.
alter table public.chat_sessions
  alter column title set default 'New Sulu AI session';

update public.chat_sessions
set title = 'New Sulu AI session'
where title = 'New Newton AI session';
