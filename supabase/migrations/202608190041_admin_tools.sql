-- Admin tools, and the archive fixes found while checking why some olympiads
-- would not open.

-- ------------------------------------------------------- hidden tasks ---
-- A problem can be taken out of circulation without deleting it: attempts,
-- reports and class plans that point at it keep their history.
alter table public.tasks add column if not exists hidden boolean not null default false;
create index if not exists tasks_hidden_idx on public.tasks(hidden) where hidden;

drop policy if exists "Signed-in users can view tasks" on public.tasks;
create policy "Signed-in users can view tasks"
  on public.tasks for select to authenticated
  using (
    (class_id is null and not hidden)
    or (class_id is not null and (public.owns_class(class_id) or public.in_class(class_id)))
  );

-- ------------------------------------------------------ blocked users ---
-- A blocked account keeps its data and cannot sign in; its open sessions are
-- ended when it is blocked.
alter table auth.users add column if not exists banned_at timestamptz;
alter table auth.users add column if not exists ban_reason text;

-- -------------------------------------------------------- admin log -----
-- Every change made from the admin panel, so a second admin can see who did
-- what. Only the service role reads or writes it.
create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_created_idx on public.admin_log(created_at desc);
alter table public.admin_log enable row level security;
grant all on public.admin_log to service_role;

-- ---------------------------------------------------- site settings -----
-- Small switches the admin panel owns: the announcement banner, whether new
-- accounts may be created.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_settings enable row level security;
drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select to anon, authenticated using (true);
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;

-- ------------------------------------------------------ olympiad slugs ---
-- Rows added before slugs existed had none, and their page link read
-- /olympiads/null.
update public.competitions
   set slug = 'olympiad-' || substr(replace(id::text, '-', ''), 1, 8)
 where slug is null or btrim(slug) = '';

