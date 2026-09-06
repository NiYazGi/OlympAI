-- Who may add material everyone sees.
--
-- resources are visible to every signed-in student, so they cannot be writable
-- by every signed-in student. There was no notion of an administrator until
-- now; this is the smallest one that works.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- The insert goes through the service role in the server action, which checks
-- this flag first. No client-facing write policy is added: a policy could only
-- check who is writing, not what, and the licence trigger has to run on
-- content nobody can bypass.
