'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { billingEnabled, cancelOrder, cancelSubscription, createOrder, fulfilOrder, orderFor } from '@/lib/billing'
import { isPlanId } from '@/lib/billing-types'
import { getVerifiedUser } from '@/lib/supabase/auth'
import { getT } from '@/lib/i18n/server'

export type BillingResult = { ok: boolean; error?: string }

/** Starts a purchase: a pending order at today's price, then the checkout page. */
export async function buyPlan(planId: string): Promise<BillingResult> {
  const t = await getT()
  if (!billingEnabled()) return { ok: false, error: t('Plans are not available here yet.') }
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }
  if (!isPlanId(planId) || planId === 'free') return { ok: false, error: t('That plan cannot be bought.') }
  const orderId = await createOrder(user.id, planId)
  if (!orderId) return { ok: false, error: t('The order could not be created. Please try again.') }
  redirect(`/checkout/${orderId}`)
}

/**
 * The test gateway: no money moves. A real gateway replaces this with its own
 * callback, which calls the same fulfilOrder once the payment is confirmed.
 */
export async function payTestOrder(orderId: string): Promise<BillingResult> {
  const t = await getT()
  if (!billingEnabled()) return { ok: false, error: t('Plans are not available here yet.') }
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }
  const order = await orderFor(user.id, orderId)
  if (!order) return { ok: false, error: t('That order was not found.') }
  if (order.provider !== 'test') return { ok: false, error: t('This order is paid through the payment provider.') }
  const paid = await fulfilOrder(orderId, user.id, `test-${Date.now()}`)
  if (!paid && order.status !== 'paid') return { ok: false, error: t('This order can no longer be paid.') }
  revalidatePath('/pricing')
  revalidatePath('/settings')
  redirect(`/checkout/${orderId}`)
}

export async function abandonOrder(orderId: string): Promise<BillingResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }
  await cancelOrder(orderId, user.id)
  redirect('/pricing')
}

/** The period already paid for keeps running; it is just not renewed. */
export async function stopRenewal(subscriptionId: string): Promise<BillingResult> {
  const t = await getT()
  const user = await getVerifiedUser()
  if (!user) return { ok: false, error: t('Your session has expired. Please log in again.') }
  await cancelSubscription(subscriptionId, user.id)
  revalidatePath('/pricing')
  revalidatePath('/settings')
  return { ok: true }
}
