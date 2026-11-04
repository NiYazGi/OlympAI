-- What a Supabase project provides before the first migration runs, recreated
-- for the embedded database: the three API roles, the auth schema with its
-- users table, and auth.uid()/auth.role() reading the per-request claims that
-- lib/db/client.ts sets inside every transaction.
--
-- Runs before supabase/migrations/*, so the migrations apply unchanged.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  encrypted_password text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz default now(),
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- Opaque random ids in an httpOnly cookie. Only the hash is stored, so a copy
-- of the database file does not hand out live sessions.
create table if not exists auth.sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on auth.sessions(user_id);

-- One-time password-reset tokens, hashed for the same reason.
create table if not exists auth.recovery_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.role() returns text
language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Supabase's default privileges: every table a migration creates is granted to
-- the API roles, and RLS decides what each can see. Migrations that narrow a
-- grant (0022 takes the answer keys away from `authenticated`) rely on this.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
