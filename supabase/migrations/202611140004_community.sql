-- Community (switched on per deployment with OLYMPAI_COMMUNITY=1; the test
-- site has it): a forum, public profiles and awards.
--
-- Everything is read and written by the server (service role) after it has
-- checked the session, the same as billing: the browser never talks to these
-- tables, so a post cannot be written in someone else's name.

create table if not exists public.forum_categories (
  slug text primary key check (slug ~ '^[a-z][a-z0-9-]{1,40}$'),
  name text not null,
  description text not null default '',
  position smallint not null default 0,
  admin_only boolean not null default false
);

insert into public.forum_categories (slug, name, description, position, admin_only) values
  ('announcements', 'Announcements', 'News from the OlympAI team.', 0, true),
  ('mathematics', 'Mathematics', 'Problems, methods and proofs.', 1, false),
  ('physics', 'Physics', 'Problems, experiments and estimates.', 2, false),
  ('informatics', 'Informatics', 'Algorithms, code and contest problems.', 3, false),
  ('olympiads', 'Olympiads and admission', 'Stages, dates, selection, schools and universities.', 4, false),
  ('feedback', 'Ideas and feedback', 'What to add or fix on OlympAI.', 5, false),
  ('lounge', 'Lounge', 'Everything else.', 6, false)
on conflict (slug) do update set name = excluded.name, description = excluded.description, position = excluded.position, admin_only = excluded.admin_only;

create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category text not null references public.forum_categories (slug) on delete restrict,
  author_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 1 and 20000),
  task_id text references public.tasks (id) on delete set null,
  pinned boolean not null default false,
  locked boolean not null default false,
  solved_post_id uuid,
  reply_count integer not null default 0,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists forum_threads_category_idx on public.forum_threads (category, pinned desc, last_post_at desc);
create index if not exists forum_threads_task_idx on public.forum_threads (task_id) where task_id is not null;
create index if not exists forum_threads_author_idx on public.forum_threads (author_id);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists forum_posts_thread_idx on public.forum_posts (thread_id, created_at);
create index if not exists forum_posts_author_idx on public.forum_posts (author_id);

-- A like on the opening post of a thread has post_id null.
create table if not exists public.forum_likes (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  post_id uuid references public.forum_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists forum_likes_once on public.forum_likes (thread_id, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id);

-- Awards: earned automatically (forum activity, solved problems) or given by
-- an admin. The catalogue of awards is in code (lib/awards.ts); a row is one
-- award given to one account, once.
create table if not exists public.user_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  award text not null check (award ~ '^[a-z][a-z0-9-]{1,40}$'),
  note text not null default '',
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, award)
);
create index if not exists user_awards_user_idx on public.user_awards (user_id, created_at desc);

-- A short "about" line for the public profile.
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 300);

do $$
declare
  name text;
begin
  foreach name in array array['forum_categories', 'forum_threads', 'forum_posts', 'forum_likes', 'user_awards'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from anon, authenticated', name);
    execute format('grant all on public.%I to service_role', name);
  end loop;
end $$;
