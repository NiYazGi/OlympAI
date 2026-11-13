import 'server-only'

import { cache } from 'react'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/supabase/auth'

/**
 * Plans, subscriptions and what the student currently has.
 *
 * Billing is switched on per deployment (OLYMPAI_BILLING=1): the test site has
 * it, the live site does not yet, and with it off every page and check below
 * behaves as if the student had the top plan, exactly like before.
 *
 * A promotion (OLYMPAI_PROMO_UNLIMIT_UNTIL, an ISO date) gives every account —
 * existing and new — the Unlimit plan until that moment, without writing a
 * subscription for anyone: when it ends, each account falls back to whatever
 * it has actually bought.
 */

export type { PlanId } from '@/lib/billing-types'
import type { PlanId } from '@/lib/billing-types'
export type Plan = { id: PlanId; name: string; priceKzt: number; periodDays: number; rank: number }

export function billingEnabled() {
  return process.env.OLYMPAI_BILLING === '1'
}

export function promoUntil(): Date | null {
  const raw = process.env.OLYMPAI_PROMO_UNLIMIT_UNTIL
  if (!raw) return null
  const at = new Date(raw)
  return Number.isNaN(at.getTime()) ? null : at
}

export const getPlans = cache(async (): Promise<Plan[]> => {
  const db = await getDb()
  const { rows } = await db.query<{ id: PlanId; name: string; price_kzt: number; period_days: number; rank: number }>(
    'select id, name, price_kzt, period_days, rank from public.plans where active order by rank',
  )
  return rows.map((row) => ({ id: row.id, name: row.name, priceKzt: row.price_kzt, periodDays: row.period_days, rank: row.rank }))
})

export type Subscription = {
  id: string
  planId: PlanId
  startsAt: string
  endsAt: string
  source: 'purchase' | 'admin'
  canceledAt: string | null
}

export type Entitlement = {
  plan: PlanId
  /** Why the student has this plan. */
  via: 'promo' | 'subscription' | 'free' | 'billing-off'
  /** When the access that gives this plan runs out, if it does. */
  until: string | null
  /** The paid subscription underneath, shown even while the promo covers it. */
  subscription: Subscription | null
}

async function activeSubscriptions(userId: string): Promise<Subscription[]> {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; plan_id: PlanId; starts_at: string; ends_at: string; source: 'purchase' | 'admin'; canceled_at: string | null; rank: number }>(
    // ends_at is how far the plan is covered without a gap: a renewal bought
    // early is its own row that starts where this one ends.
    `select s.id, s.plan_id, s.starts_at,
            (select max(n.ends_at) from public.subscriptions n
              where n.user_id = s.user_id and n.plan_id = s.plan_id and n.ends_at > now()) as ends_at,
            s.source, s.canceled_at, p.rank
       from public.subscriptions s join public.plans p on p.id = s.plan_id
      where s.user_id = $1 and s.starts_at <= now() and s.ends_at > now()
      order by p.rank desc, s.ends_at desc`,
    [userId],
  )
  return rows.map((row) => ({ id: row.id, planId: row.plan_id, startsAt: row.starts_at, endsAt: row.ends_at, source: row.source, canceledAt: row.canceled_at }))
}

export async function entitlementFor(userId: string | null): Promise<Entitlement> {
  if (!billingEnabled()) return { plan: 'unlimit', via: 'billing-off', until: null, subscription: null }
  const subscription = userId ? (await activeSubscriptions(userId))[0] ?? null : null
  const promo = promoUntil()
  if (promo && promo.getTime() > Date.now()) {
    return { plan: 'unlimit', via: 'promo', until: promo.toISOString(), subscription }
  }
  if (subscription) return { plan: subscription.planId, via: 'subscription', until: subscription.endsAt, subscription }
  return { plan: 'free', via: 'free', until: null, subscription: null }
}

/** The signed-in student's plan, once per request. */
export const getEntitlement = cache(async () => entitlementFor(await getSessionUserId()))

export type Order = {
  id: string
  planId: PlanId
  amountKzt: number
  status: 'pending' | 'paid' | 'failed' | 'canceled'
  provider: string
  createdAt: string
  paidAt: string | null
}

export async function ordersFor(userId: string, limit = 20): Promise<Order[]> {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; plan_id: PlanId; amount_kzt: number; status: Order['status']; provider: string; created_at: string; paid_at: string | null }>(
    'select id, plan_id, amount_kzt, status, provider, created_at, paid_at from public.orders where user_id = $1 order by created_at desc limit $2',
    [userId, limit],
  )
  return rows.map((row) => ({ id: row.id, planId: row.plan_id, amountKzt: row.amount_kzt, status: row.status, provider: row.provider, createdAt: row.created_at, paidAt: row.paid_at }))
}

export async function orderFor(userId: string, id: string): Promise<Order | null> {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; plan_id: PlanId; amount_kzt: number; status: Order['status']; provider: string; created_at: string; paid_at: string | null }>(
    'select id, plan_id, amount_kzt, status, provider, created_at, paid_at from public.orders where id = $1 and user_id = $2',
    [id, userId],
  )
  const row = rows[0]
  return row ? { id: row.id, planId: row.plan_id, amountKzt: row.amount_kzt, status: row.status, provider: row.provider, createdAt: row.created_at, paidAt: row.paid_at } : null
}

/** A new pending order at the plan's current price. */
export async function createOrder(userId: string, planId: PlanId): Promise<string | null> {
  const plan = (await getPlans()).find((entry) => entry.id === planId)
  if (!plan || plan.priceKzt <= 0) return null
  const db = await getDb()
  const { rows } = await db.query<{ id: string }>(
    `insert into public.orders (user_id, plan_id, amount_kzt, provider) values ($1, $2, $3, 'test') returning id`,
    [userId, plan.id, plan.priceKzt],
  )
  return rows[0]?.id ?? null
}

/**
 * Marks an order paid and grants the period it bought, in one transaction, so
 * a double click cannot pay twice or grant twice. Buying the plan you already
 * have extends it from its current end; buying another plan starts now.
 */
export async function fulfilOrder(orderId: string, userId: string, providerRef: string | null = null): Promise<boolean> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ plan_id: PlanId; period_days: number }>(
      `update public.orders o set status = 'paid', paid_at = now(), provider_ref = $3
         from public.plans p
        where o.id = $1 and o.user_id = $2 and o.status = 'pending' and p.id = o.plan_id
        returning o.plan_id, p.period_days`,
      [orderId, userId, providerRef],
    )
    const paid = rows[0]
    if (!paid) return false
    const { rows: current } = await tx.query<{ ends_at: string }>(
      `select ends_at from public.subscriptions
        where user_id = $1 and plan_id = $2 and ends_at > now()
        order by ends_at desc limit 1`,
      [userId, paid.plan_id],
    )
    const start = current[0]?.ends_at ?? new Date().toISOString()
    await tx.query(
      `insert into public.subscriptions (user_id, plan_id, starts_at, ends_at, source, order_id)
       values ($1, $2, $3::timestamptz, $3::timestamptz + make_interval(days => $4), 'purchase', $5)`,
      [userId, paid.plan_id, start, paid.period_days, orderId],
    )
    return true
  })
}

export async function cancelOrder(orderId: string, userId: string) {
  const db = await getDb()
  await db.query(`update public.orders set status = 'canceled' where id = $1 and user_id = $2 and status = 'pending'`, [orderId, userId])
}

/** Stops renewal: the period already paid for keeps running to its end. */
export async function cancelSubscription(subscriptionId: string, userId: string) {
  const db = await getDb()
  await db.query(
    'update public.subscriptions set canceled_at = now() where id = $1 and user_id = $2 and canceled_at is null',
    [subscriptionId, userId],
  )
}

/** From the admin panel: a plan for a number of days, no payment. */
export async function grantSubscription(userId: string, planId: PlanId, days: number) {
  const db = await getDb()
  await db.query(
    `insert into public.subscriptions (user_id, plan_id, starts_at, ends_at, source)
     values ($1, $2, now(), now() + make_interval(days => $3), 'admin')`,
    [userId, planId, days],
  )
}

export async function endSubscriptionNow(subscriptionId: string, userId: string) {
  const db = await getDb()
  // A renewal that has not started yet is closed the same way, so the row
  // stays in the history with a valid (short, past) period.
  await db.query(
    `update public.subscriptions
        set starts_at = least(starts_at, now() - interval '1 second'), ends_at = now(), canceled_at = coalesce(canceled_at, now())
      where id = $1 and user_id = $2 and ends_at > now()`,
    [subscriptionId, userId],
  )
}

/** `active` is true for a running period and for a renewal waiting to start. */
export async function subscriptionsFor(userId: string): Promise<(Subscription & { active: boolean })[]> {
  const db = await getDb()
  const { rows } = await db.query<{ id: string; plan_id: PlanId; starts_at: string; ends_at: string; source: 'purchase' | 'admin'; canceled_at: string | null; active: boolean }>(
    `select id, plan_id, starts_at, ends_at, source, canceled_at, ends_at > now() as active
       from public.subscriptions where user_id = $1 order by ends_at desc limit 20`,
    [userId],
  )
  return rows.map((row) => ({ id: row.id, planId: row.plan_id, startsAt: row.starts_at, endsAt: row.ends_at, source: row.source, canceledAt: row.canceled_at, active: row.active }))
}
