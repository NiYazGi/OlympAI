import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, FlaskConical } from 'lucide-react'
import { AbandonButton, PayTestButton } from '@/components/billing/billing-buttons'
import { billingEnabled, getPlans, orderFor } from '@/lib/billing'
import { PLAN_COPY } from '@/lib/plan-features'
import { getSessionUserId } from '@/lib/supabase/auth'
import { formatDate } from '@/lib/i18n/config'
import { getLocale, getT } from '@/lib/i18n/server'
import { buttonVariants } from '@/components/ui/button'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Checkout') }
}

function money(kzt: number) {
  return `${kzt.toLocaleString('ru-RU')} ₸`
}

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  if (!billingEnabled()) notFound()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const userId = await getSessionUserId()
  if (!userId) notFound()
  const [t, locale, plans, order] = await Promise.all([getT(), getLocale(), getPlans(), orderFor(userId, id)])
  if (!order) notFound()
  const plan = plans.find((entry) => entry.id === order.planId)
  const copy = PLAN_COPY[order.planId]

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4 sm:p-8">
      <section className={cn(cardClass, 'space-y-5 p-6')}>
        {order.status === 'paid' ? (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h1 className="text-2xl font-semibold">{t('{plan} is active', { plan: plan?.name ?? '' })}</h1>
            <p className="text-sm text-muted-foreground">
              {t('Paid on {date}. Thank you!', {
                date: formatDate(new Date(order.paidAt ?? order.createdAt), locale, { day: 'numeric', month: 'long', year: 'numeric' }),
              })}
            </p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className={buttonVariants()}>{t('Back to studying')}</Link>
              <Link href="/pricing#subscription" className={buttonVariants({ variant: 'outline' })}>{t('My subscription')}</Link>
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">{t('Checkout')}</p>
              <h1 className="mt-1 text-2xl font-semibold">OlympAI {plan?.name} · {t('1 month')}</h1>
            </div>
            <ul className="space-y-1.5 text-sm">
                {copy.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    {t(item)}
                  </li>
                ))}
            </ul>
            <dl className="text-sm">
              <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-semibold">
                <dt>{t('Total')}</dt>
                <dd className="tabular-nums">{money(order.amountKzt)}</dd>
              </div>
            </dl>

            {order.status === 'pending' ? (
              <>
                {order.provider === 'test' ? (
                  <div className="flex gap-2.5 rounded-lg border border-dashed border-border p-3 text-sm">
                    <FlaskConical className="mt-0.5 size-4 shrink-0 text-coral" />
                    <p className="text-muted-foreground">
                      {t('Test payment: no card is asked for and no money is charged. The plan is switched on exactly as after a real payment.')}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <PayTestButton orderId={order.id} label={t('Pay {sum} (test)', { sum: money(order.amountKzt) })} />
                  <AbandonButton orderId={order.id} label={t('Cancel')} />
                </div>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{t('This order was canceled.')}</p>
                <Link href="/pricing" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>{t('Back to plans')}</Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
