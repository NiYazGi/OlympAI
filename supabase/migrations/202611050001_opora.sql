-- Opora: verified problem cards, a hint ladder and a tutor that remembers
-- facts instead of whole transcripts.
--
-- A card is prepared once per problem (drafted by the model from the reference
-- solution, then checked by an admin) and serves every student. Ready hint
-- texts on a verified card are shown without calling the model at all.
--
-- All three tables hold either the solution or a student's working state, so
-- only the service role reads or writes them.

-- ---------------------------------------------------------- task cards ---
create table if not exists public.task_cards (
  task_id text primary key references public.tasks(id) on delete cascade,
  -- The answer the student must reach; used to catch a hint that gives it away.
  final_answer text,
  notation text,
  assumptions text,
  -- Ordered key steps of the verified solution: ["...", "..."].
  key_steps jsonb not null default '[]'::jsonb,
  -- Typical mistakes and what fixes them: [{"mistake": "...", "fix": "..."}].
  mistakes jsonb not null default '[]'::jsonb,
  -- Ready texts per ladder level: {"nudge": "...", "idea": "...", "step": "...", "check": "..."}.
  hints jsonb not null default '{}'::jsonb,
  -- The problem cannot be solved without its figure.
  needs_figure boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'verified')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.task_cards enable row level security;
grant all on public.task_cards to service_role;

-- --------------------------------------------------------- tutor state ---
-- What the tutor knows about one student's work on one problem: short facts,
-- not the whole conversation.
create table if not exists public.tutor_state (
  session_id uuid primary key references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  -- Highest ladder level reached: 1 nudge, 2 idea, 3 step, 4 walkthrough, 5 check.
  level smallint not null default 0,
  confirmed text,
  difficulty text,
  help_given jsonb not null default '[]'::jsonb,
  current_request text,
  certainty text check (certainty in ('high', 'medium', 'low')),
  summary text,
  updated_at timestamptz not null default now()
);
create index if not exists tutor_state_user_idx on public.tutor_state(user_id);
alter table public.tutor_state enable row level security;
grant all on public.tutor_state to service_role;

-- ------------------------------------------------------------ AI usage ---
-- One row per answer the tutor gave: from the model (with its tokens) or
-- straight from a card (no tokens, no cost).
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  task_id text references public.tasks(id) on delete set null,
  kind text not null,
  source text not null check (source in ('model', 'card')),
  level smallint,
  model text,
  input_tokens int not null default 0,
  cached_tokens int not null default 0,
  output_tokens int not null default 0,
  -- The answer had to be replaced because it gave the solution away or broke formatting.
  guarded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_created_idx on public.ai_usage(created_at desc);
alter table public.ai_usage enable row level security;
grant all on public.ai_usage to service_role;

-- Which ladder level a tutor message answered, and where it came from.
alter table public.chat_messages add column if not exists meta jsonb;
