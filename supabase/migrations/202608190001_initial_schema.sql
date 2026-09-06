create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  grade text,
  primary_subject text,
  level text,
  goal text,
  target_competition_type text,
  training_intensity text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  unique (subject_id, slug)
);

create table public.tasks (
  id text primary key,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  topic_id uuid not null references public.topics(id) on delete restrict,
  title text not null,
  problem text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  official_solution text,
  hints text[] not null default '{}',
  source text,
  created_at timestamptz not null default now()
);

create table public.task_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  score smallint not null default 0 check (score between 0 and 100),
  feedback text,
  created_at timestamptz not null default now()
);

create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  solved_count integer not null default 0 check (solved_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0 and correct_count <= solved_count),
  mastery_score numeric(5,2) not null default 0 check (mastery_score between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (user_id, subject_id, topic_id)
);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Sulu AI session',
  subject_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index task_attempts_user_id_idx on public.task_attempts(user_id);
create index user_progress_user_id_idx on public.user_progress(user_id);
create index chat_sessions_user_id_idx on public.chat_sessions(user_id);
create index chat_messages_session_id_idx on public.chat_messages(session_id);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.tasks enable row level security;
alter table public.task_attempts enable row level security;
alter table public.user_progress enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Signed-in users can view subjects" on public.subjects for select to authenticated using (true);
create policy "Signed-in users can view topics" on public.topics for select to authenticated using (true);
create policy "Signed-in users can view tasks" on public.tasks for select to authenticated using (true);

create policy "Users can view their attempts" on public.task_attempts for select using (auth.uid() = user_id);
create policy "Users can create their attempts" on public.task_attempts for insert with check (auth.uid() = user_id);
create policy "Users can update their attempts" on public.task_attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view their progress" on public.user_progress for select using (auth.uid() = user_id);
create policy "Users can create their progress" on public.user_progress for insert with check (auth.uid() = user_id);
create policy "Users can update their progress" on public.user_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view their chat sessions" on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Users can create their chat sessions" on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their chat sessions" on public.chat_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their chat sessions" on public.chat_sessions for delete using (auth.uid() = user_id);

create policy "Users can view messages in their sessions" on public.chat_messages for select using (
  exists (select 1 from public.chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
);
create policy "Users can create messages in their sessions" on public.chat_messages for insert with check (
  exists (select 1 from public.chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
);
create policy "Users can update messages in their sessions" on public.chat_messages for update using (
  exists (select 1 from public.chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
);
create policy "Users can delete messages in their sessions" on public.chat_messages for delete using (
  exists (select 1 from public.chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.subjects (name, slug) values
  ('Physics', 'physics'),
  ('Mathematics', 'mathematics'),
  ('Computer Science', 'computer-science')
on conflict (slug) do nothing;
