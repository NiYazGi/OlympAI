-- Paid plans, subscriptions and orders.
--
-- The catalogue of plans lives here so prices can change without a deploy.
-- A subscription is a period of access to a plan; an order is one purchase
-- attempt. Students read their own subscriptions and orders; only the server
-- (service role) writes either, so access can never be granted from the
-- browser.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_kzt integer not null check (price_kzt >= 0),
  period_days integer not null default 30 check (period_days > 0),
  rank smallint not null,
  active boolean not null default true
);
alter table public.plans enable row level security;
drop policy if exists "Anyone can read plans" on public.plans;
create policy "Anyone can read plans" on public.plans for select to anon, authenticated using (true);
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;

insert into public.plans (id, name, price_kzt, period_days, rank) values
  ('free', 'Free', 0, 30, 0),
  ('plus', 'Plus', 2500, 30, 1),
  ('unlimit', 'Unlimit', 9900, 30, 2)
on conflict (id) do update set name = excluded.name, price_kzt = excluded.price_kzt, rank = excluded.rank;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  -- purchase: paid by the student · admin: granted from the admin panel
  source text not null check (source in ('purchase', 'admin')),
  canceled_at timestamptz,
  order_id uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id, ends_at desc);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
drop policy if exists "Read own subscriptions" on public.subscriptions;
create policy "Read own subscriptions" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  amount_kzt integer not null check (amount_kzt >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled')),
  -- 'test' takes no money; a real gateway gets its own name here.
  provider text not null default 'test',
  provider_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
drop policy if exists "Read own orders" on public.orders;
create policy "Read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
