create table public.profile_avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  webp_base64 text not null check (length(webp_base64) between 1 and 262144),
  updated_at timestamptz not null default now()
);

alter table public.profile_avatars enable row level security;
revoke all on public.profile_avatars from anon, authenticated;
grant select, insert, update on public.profile_avatars to authenticated;
create policy "Manage own avatar" on public.profile_avatars
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.lesson_views add column first_completed_at timestamptz;
update public.lesson_views set first_completed_at = completed_at where completed_at is not null;

-- The read flag can be undone. Keep the first completion for XP.
create function public.record_first_lesson_completion()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.first_completed_at := case when new.completed_at is not null then now() end;
  if tg_op = 'UPDATE' and old.first_completed_at is not null then
    new.first_completed_at := old.first_completed_at;
  end if;
  return new;
end;
$$;

create trigger record_first_lesson_completion
  before insert or update on public.lesson_views
  for each row execute function public.record_first_lesson_completion();
