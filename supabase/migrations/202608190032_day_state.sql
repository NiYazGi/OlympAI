-- The day, as five numbers.
--
-- Everything else in this schema measures work: attempts, answers, papers.
-- None of it can see the two things that decide whether the work lands — how
-- the student slept, and whether they spent the day on one thing. A student
-- who solves six problems on four hours of sleep is not ahead of one who
-- solved three and slept eight, and the app had no way to say so.
--
-- So this table records the day as the student reports it, and lib/day-state.ts
-- scores it. Five axes, five points each, and the bar is more than fifteen out
-- of twenty-five: the total can be reached in several ways on purpose, because
-- the point of the diagram is that sleeping is worth the same as solving.
--
-- Self-reported, like lesson_views: there is no artefact that proves a night's
-- sleep. It pays no XP and unlocks nothing, so it is safe to write from the
-- client under RLS. It is the student's own record of their own week, and
-- nobody else can read it.
create table if not exists public.day_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The UTC day, which is what the rest of the app means by "today": XP,
  -- streaks and the weekly strip are all cut on the same boundary. A local
  -- calendar day would be kinder and would also let the day's own score and
  -- the XP inside it roll over at different hours, on the same card.
  on_date date not null,
  sleep_hours numeric(3, 1) not null default 0 check (sleep_hours >= 0 and sleep_hours <= 16),
  -- In bed by 22:30. Only binds in the last fortnight, when the night before
  -- the paper is the one being rehearsed.
  lights_out boolean not null default false,
  study_minutes integer not null default 0 check (study_minutes >= 0 and study_minutes <= 1080),
  -- The day went to this and nothing else of the same size.
  sole_focus boolean not null default false,
  -- Worked through something with another person rather than alone.
  with_people boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, on_date)
);

create index if not exists day_states_user_date_idx
  on public.day_states(user_id, on_date desc);

alter table public.day_states enable row level security;

drop policy if exists "Users can view their days" on public.day_states;
create policy "Users can view their days"
  on public.day_states for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can record their days" on public.day_states;
create policy "Users can record their days"
  on public.day_states for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can correct their days" on public.day_states;
create policy "Users can correct their days"
  on public.day_states for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- What the medal is for.
--
-- A place at an olympiad is a means, and a student who has written down the
-- end it is a means to has an answer on the evenings when the means is not
-- enough. Free text and never validated: this is the student's sentence about
-- their own life, not a row in a catalogue of universities we would then have
-- to keep accurate.
alter table public.profiles add column if not exists target_university text;
