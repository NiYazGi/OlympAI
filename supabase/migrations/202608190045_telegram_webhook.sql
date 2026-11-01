-- Telegram, from the deployment rather than from a laptop.
--
-- The bot has been long polling since it was written: it asks Telegram for
-- updates in a loop, which needs a process that stays up and therefore a
-- machine somebody owns. Now that the app is deployed there is a public
-- address, and Telegram can call it instead. A webhook has no memory between
-- calls, so the two things the loop kept in RAM have to live here.

-- ------------------------------------------------------- linking by code ---
-- The chat was linked by matching the Telegram username a student typed at
-- sign-up. That asks them to copy a string correctly into a field they will
-- never see again, and leaves anyone who skipped it with no way in at all.
--
-- A one-time code is the usual answer and a better one: the app shows a deep
-- link, Telegram passes the code to the bot as `/start <code>`, and the chat
-- that arrives holding it is the chat that opened the link. Username matching
-- stays as a fallback for anyone already linked that way.
alter table public.profiles
  add column if not exists telegram_link_code text;

create unique index if not exists profiles_telegram_link_code_key
  on public.profiles(telegram_link_code)
  where telegram_link_code is not null;

-- ------------------------------------------------- the half-asked check-in ---
-- Five questions, one message each, and nothing between them to remember
-- which one is next. A serverless function is a different process every time.
--
-- Written only by the webhook with the service role; `authenticated` gets no
-- policy at all, because the row is keyed by a Telegram chat id and nothing a
-- browser session holds says anything about one.
create table if not exists public.telegram_sessions (
  chat_id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Which question is outstanding, 0-based.
  step smallint not null default 0 check (step between 0 and 10),
  -- What has been answered so far, by the question's own key.
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists telegram_sessions_user_idx on public.telegram_sessions(user_id);

alter table public.telegram_sessions enable row level security;
