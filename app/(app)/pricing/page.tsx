import { notFound } from 'next/navigation'
import { Check, Gift } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { BuyButton } from '@/components/billing/billing-buttons'
import { billingEnabled, getEntitlement, getPlans, ordersFor, type Plan } from '@/lib/billing'
import { PLAN_COPY } from '@/lib/plan-features'
import { getSessionUserId } from '@/lib/supabase/auth'
import { formatDate, type Locale } from '@/lib/i18n/config'
import { getLocale, getT } from '@/lib/i18n/server'
import { cardClass, cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Plans') }
}

function money(kzt: number) {
  return `${kzt.toLocaleString('ru-RU')} ₸`
}

function day(value: string, locale: Locale) {
  return formatDate(new Date(value), locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PricingPage() {
  if (!billingEnabled()) notFound()
  const [t, locale, plans, entitlement, userId] = await Promise.all([getT(), getLocale(), getPlans(), getEntitlement(), getSessionUserId()])
  const orders = userId ? await ordersFor(userId, 10) : []
  const sub = entitlement.subscription

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={t('Plans')}
        description={t('The whole archive, hints and checking your solutions are free. Plus adds a system to the preparation, Pro a personal AI coach.')}
      />

      {entitlement.via === 'promo' && entitlement.until ? (
        <section className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Gift className="mt-0.5 size-5 shrink-0 text-coral" />
          <div>
            <p className="font-semibold">{t('{plan} is free for everyone until {date}', { plan: plans.find((plan) => plan.id === 'unlimit')?.name ?? 'Pro', date: day(entitlement.until, locale) })}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('Nothing to do: every account, new and existing, already has it. After that date you keep the plan you have bought, or move to Free.')}
            </p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan: Plan) => {
          const current = entitlement.plan === plan.id && entitlement.via !== 'promo'
          const paidCurrent = sub?.planId === plan.id
          return (
            <section
              key={plan.id}
              className={cn(cardClass, 'flex flex-col p-6', plan.id === 'plus' && 'ring-2 ring-foreground/80')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">OlympAI {plan.name}</h2>
                {PLAN_COPY[plan.id].audience ? <span className="text-xs font-medium text-coral">{t(PLAN_COPY[plan.id].audience!)}</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t(PLAN_COPY[plan.id].tagline)}</p>
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {plan.priceKzt ? money(plan.priceKzt) : t('Free')}
                {plan.priceKzt ? <span className="text-base font-normal text-muted-foreground"> / {t('month')}</span> : null}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {PLAN_COPY[plan.id].items.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {t(line)}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.priceKzt === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">{current ? t('Your plan') : t('Always available')}</p>
                ) : (
                  <BuyButton
                    planId={plan.id}
                    variant={plan.id === 'plus' ? 'default' : 'outline'}
                    label={paidCurrent ? t('Extend for a month') : t('Buy {plan}', { plan: plan.name })}
                  />
                )}
              </div>
            </section>
          )
        })}
      </div>


      <section className={cn(cardClass, 'space-y-4 p-5 sm:p-6')} id="subscription">
        <h2 className="text-lg font-semibold">{t('Your subscription')}</h2>
        {sub ? (
          <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">
                {plans.find((plan) => plan.id === sub.planId)?.name} · {t('paid until {date}', { date: day(sub.endsAt, locale) })}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {sub.canceledAt
                  ? t('Will not be renewed. Access stays until the end of the period.')
                  : sub.source === 'admin'
                    ? t('Granted by the OlympAI team.')
                    : t('Renews only when you pay again; nothing is charged automatically.')}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('No paid subscription yet.')}</p>
        )}

        {orders.length ? (
          <div>
            <h3 className="text-sm font-medium">{t('Payments')}</h3>
            <ul className="mt-2 divide-y divide-border text-sm">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {plans.find((plan) => plan.id === order.planId)?.name} · {money(order.amountKzt)}
                  </span>
                  <span className="text-muted-foreground">
                    {day(order.createdAt, locale)} · {t(`order:${order.status}`)}
                    {order.provider === 'test' ? ` · ${t('test payment')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  )
}
