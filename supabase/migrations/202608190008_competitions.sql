-- Back the Olympiads page with real rows.
--
-- The page previously rendered four invented competitions with invented dates,
-- invented readiness percentages and a "Register" button wired to nothing.
-- Fabricated competition dates are the one kind of filler a student could act
-- on, so the page now reads from these tables and shows an honest empty state
-- until someone seeds them.

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  level text,
  starts_on date not null,
  ends_on date,
  registration_url text,
  registration_deadline date,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.competition_registrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, competition_id)
);

create index if not exists competitions_starts_on_idx
  on public.competitions(starts_on);

alter table public.competitions enable row level security;
alter table public.competition_registrations enable row level security;

drop policy if exists "Signed-in users can view competitions" on public.competitions;
create policy "Signed-in users can view competitions"
  on public.competitions for select to authenticated using (true);

drop policy if exists "Users can view their registrations" on public.competition_registrations;
create policy "Users can view their registrations"
  on public.competition_registrations for select using (auth.uid() = user_id);

drop policy if exists "Users can register themselves" on public.competition_registrations;
create policy "Users can register themselves"
  on public.competition_registrations for insert with check (auth.uid() = user_id);

drop policy if exists "Users can withdraw themselves" on public.competition_registrations;
create policy "Users can withdraw themselves"
  on public.competition_registrations for delete using (auth.uid() = user_id);

-- Deliberately no seed data: an empty Olympiads page is correct, a page of
-- plausible-looking fictional competitions is not.
