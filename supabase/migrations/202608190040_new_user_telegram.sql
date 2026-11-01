-- Carry the Telegram username across from sign-up.
--
-- The profile row is created by a trigger on auth.users, from the metadata the
-- sign-up form put there. It only ever copied the full name, so the username a
-- student typed on the form was written into auth metadata and then dropped on
-- the floor — they filled in a field that did nothing.
--
-- Replaced rather than edited: migration 0001 is applied and stays applied.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, telegram_username)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(lower(new.raw_user_meta_data ->> 'telegram_username'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
