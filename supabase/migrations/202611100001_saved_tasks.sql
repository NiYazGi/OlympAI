-- Problems a student has put aside to come back to.
create table if not exists public.saved_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.saved_tasks enable row level security;
revoke all on public.saved_tasks from anon;
grant select, insert, delete on public.saved_tasks to authenticated;
grant all on public.saved_tasks to service_role;

drop policy if exists "Manage own saved tasks" on public.saved_tasks;
create policy "Manage own saved tasks" on public.saved_tasks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
