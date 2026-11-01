-- The columns of a profile that are the server's to set, not the student's.
--
-- profiles has had "Users can update their own profile" since migration 1, and
-- a policy decides which rows, never which columns. Since migration 18 that
-- row has carried is_admin, and since 43 role — so any signed-in account could,
-- with the publishable key every browser holds, run
--
--   update profiles set is_admin = true, role = 'teacher' where id = auth.uid()
--
-- and become an administrator who writes material every student sees, or a
-- teacher. .tools/live-profile-guard.mjs did exactly that before this
-- migration. The Telegram link columns were open the same way: setting another
-- person's chat id would route the bot's questions about one account to a
-- stranger's phone.
--
-- The app never writes these from a user's session — role comes from
-- handle_new_user at sign-up, is_admin from a person with the dashboard, the
-- Telegram columns from the webhook with the service role — so the guard
-- refuses the change outright rather than quietly keeping the old value: a
-- refusal is what a future server action that forgets this would want to see.

create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- The roles PostgREST runs browser requests as. The service role, the
  -- dashboard and security-definer functions are not these, and pass.
  if current_user in ('authenticated', 'anon') then
    if new.is_admin is distinct from old.is_admin
      or new.role is distinct from old.role
      or new.telegram_chat_id is distinct from old.telegram_chat_id
      or new.telegram_linked_at is distinct from old.telegram_linked_at
      or new.telegram_link_code is distinct from old.telegram_link_code
    then
      raise exception 'these profile fields are set by the server'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();
