-- Provenance and licence, recorded per item.
--
-- "Publicly available" is not a licence: a PDF that can be reached is still
-- copyrighted. The only way this stays answerable once hundreds of papers have
-- been imported is to record, for every single row, where it came from and
-- what may be done with it — rather than deciding the question globally once
-- and re-litigating it later.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_licence') then
    create type public.content_licence as enum (
      'public-domain',      -- copyright expired or explicitly dedicated
      'cc0',
      'cc-by',
      'cc-by-sa',           -- share-alike: derivatives inherit the licence
      'cc-by-nc',           -- non-commercial only
      'permission-granted', -- written permission from the rights holder
      'fair-quotation',     -- short excerpt relied on as quotation
      'original',           -- written for this project
      'unknown'
    );
  end if;
end
$$;

alter table public.tasks
  add column if not exists source_url text,
  add column if not exists licence public.content_licence not null default 'unknown',
  add column if not exists attribution text;

-- Everything currently in the library was written for this project.
update public.tasks set licence = 'original' where licence = 'unknown';

-- Supplementary material: lectures, readings, references. Attached to a task
-- or to a whole topic.
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  task_id text references public.tasks(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  kind text not null check (kind in ('video', 'reading', 'reference')),
  title text not null,
  url text not null,
  description text,
  licence public.content_licence not null default 'unknown',
  attribution text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  -- Must hang off something.
  check (task_id is not null or topic_id is not null)
);

create index if not exists resources_task_idx on public.resources(task_id, position);
create index if not exists resources_topic_idx on public.resources(topic_id, position);

alter table public.resources enable row level security;

drop policy if exists "Signed-in users can view resources" on public.resources;
create policy "Signed-in users can view resources"
  on public.resources for select to authenticated using (true);

-- Nothing ships with an unrecorded licence. A row that cannot say what it is
-- should not be readable as if it were cleared.
create or replace function public.reject_unlicensed_resource()
returns trigger
language plpgsql
as $$
begin
  if new.licence = 'unknown' then
    raise exception
      'resources.licence is "unknown" for %: record the licence before inserting, or do not insert it',
      new.url;
  end if;
  return new;
end;
$$;

drop trigger if exists on_resource_licence on public.resources;
create trigger on_resource_licence
before insert or update on public.resources
for each row execute procedure public.reject_unlicensed_resource();
