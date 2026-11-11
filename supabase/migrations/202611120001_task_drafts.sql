-- The unsent solution to a problem, kept with the account as well as in the
-- browser, so work started on a laptop is there on a phone and survives a
-- cleared browser.
create table if not exists public.task_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  body text not null check (length(body) between 1 and 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.task_drafts enable row level security;
revoke all on public.task_drafts from anon;
grant select, insert, update, delete on public.task_drafts to authenticated;
grant all on public.task_drafts to service_role;

drop policy if exists "Manage own drafts" on public.task_drafts;
create policy "Manage own drafts" on public.task_drafts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
