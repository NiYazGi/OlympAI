-- Model API profiles the admin panel switches between, and the prompts each
-- AI task runs with.
--
-- A profile's key is either the name of a server environment variable
-- (key_env) or a key entered in the admin panel, stored encrypted with the
-- server's AI_SECRET (api_key_enc). Only the service role reads this table.

create table if not exists public.ai_profiles (
  id text primary key,
  name text not null,
  base_url text not null,
  model text,
  key_env text,
  api_key_enc text,
  -- The provider enforces a JSON schema. Without it the schema is described in
  -- the prompt and the reply is checked, with one retry.
  strict_json boolean not null default true,
  timeout_seconds int not null default 60 check (timeout_seconds between 10 and 600),
  -- Sent as reasoning.effort when set. Thinking models answer in seconds at low
  -- and can run for minutes with nothing set.
  reasoning_effort text check (reasoning_effort in ('none', 'low', 'medium', 'high')),
  -- The same for the quick tasks (hints, grading, photo reading), where a student waits.
  reasoning_effort_fast text check (reasoning_effort_fast in ('none', 'low', 'medium', 'high')),
  built_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_profiles enable row level security;
grant all on public.ai_profiles to service_role;

-- The profile the site ran on until now: the key and model from the server env.
insert into public.ai_profiles (id, name, base_url, model, key_env, strict_json, timeout_seconds, built_in)
values ('primary', 'Основной', 'https://api.openai.com/v1', null, 'OPENAI_API_KEY', true, 60, true)
on conflict (id) do nothing;

-- The second profile. Its key lives in the server env as SULU_PROFILE2_KEY.
insert into public.ai_profiles (id, name, base_url, model, key_env, strict_json, timeout_seconds, reasoning_effort, reasoning_effort_fast, built_in)
values ('starimg', 'Резервный (hy4)', 'https://ai.starimg.ru/v1', 'hy4', 'SULU_PROFILE2_KEY', false, 180, 'low', 'none', false)
on conflict (id) do nothing;

-- The site keeps using the primary profile until an admin switches.
insert into public.site_settings (key, value) values ('ai_profile', '{"id": "primary"}'::jsonb)
on conflict (key) do nothing;
