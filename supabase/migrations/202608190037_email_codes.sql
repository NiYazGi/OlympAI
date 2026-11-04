-- Email codes for signup confirmation and password reset.
--
-- Until now an account was confirmed the moment it was created, and a reset
-- link only reached the server log: there was no mail. The site now sends a
-- six-digit code through OlympMail on the same machine (lib/mail.ts).
--
-- A code is tied to a ticket — 32 random bytes in an httpOnly cookie — so the
-- address never travels in a URL, and only hashes are stored. Five wrong
-- guesses spend a code; a new one replaces any code still open for the same
-- purpose. Accounts created before this migration are already confirmed by
-- the column default and are not asked again.

create table if not exists auth.email_codes (
  id uuid primary key default gen_random_uuid(),
  ticket_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('signup', 'reset')),
  code_hash text not null,
  attempts smallint not null default 0,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists email_codes_user_idx on auth.email_codes (user_id, purpose, sent_at desc);

-- Reset links are replaced by codes; nothing issues these any more.
delete from auth.recovery_tokens;
