-- Nobody grants themselves admin.
--
-- "Users can update their own profile" covers every column, is_admin included,
-- so any signed-in student could flip their own flag with the publishable key
-- and a single PATCH. The admin panel trusts this flag for everything it does,
-- so it has to be writable only by the service role (the panel's own server
-- actions) or by someone at the SQL console.
--
-- A trigger rather than a column grant: Supabase grants table-level UPDATE to
-- `authenticated`, and a column-level REVOKE does not narrow a table-level
-- GRANT.

create or replace function public.guard_profile_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'is_admin can only be changed by an administrator'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_admin_flag on public.profiles;
create trigger guard_profile_admin_flag
before update on public.profiles
for each row execute procedure public.guard_profile_admin_flag();

-- Profiles are created by handle_new_user(), which never sets the flag, and
-- there is no client insert policy. Kept that way on purpose.

-- To make the first administrator, run in the SQL editor:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
