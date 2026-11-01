-- The Telegram account a student is asked about their day through.
--
-- Two columns rather than one, because they answer different questions. The
-- username is what the student types at sign-up: it is how a human names
-- themselves, and it is the only thing they know about their own account. The
-- chat id is what Telegram needs to send a message, and it is only learned
-- when that person first writes to the bot.
--
-- Linking happens on the username. Telegram usernames are unique across the
-- service and cannot be held by two people at once, so a message arriving from
-- @someone is from the account that wrote @someone at sign-up. That is not a
-- security boundary and is not used as one: the link lets the bot record a
-- self-reported day, which pays no XP and unlocks nothing. Anything that
-- mattered would go through the session, as everything else does.
--
-- Stored without the leading @ and folded to lower case, because Telegram
-- treats usernames case-insensitively and a student will type it both ways.
alter table public.profiles
  add column if not exists telegram_username text,
  add column if not exists telegram_chat_id bigint,
  add column if not exists telegram_linked_at timestamptz;

-- One Telegram account to one profile. Without this a typo in someone else's
-- username would quietly point two accounts at the same chat.
create unique index if not exists profiles_telegram_username_key
  on public.profiles(lower(telegram_username))
  where telegram_username is not null;

create unique index if not exists profiles_telegram_chat_id_key
  on public.profiles(telegram_chat_id)
  where telegram_chat_id is not null;
