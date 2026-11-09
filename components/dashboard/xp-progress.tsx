import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { getT } from '@/lib/i18n/server'

export async function XpProgress({ xp, hasPreparation }: {
  xp: { today: number; goal: number }
  hasPreparation: boolean
}) {
  const t = await getT()
  const earned = Math.min(xp.today, xp.goal)
  const share = xp.goal > 0 ? earned / xp.goal * 100 : 0

  return (
    <section data-tour="stats" className="space-y-2 pb-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5">
          <Zap aria-hidden className="size-4 text-coral" />
          <span className="font-medium">{t('XP today')}</span>
          <span className="ml-1 text-muted-foreground tabular-nums">{xp.today} / {xp.goal}</span>
        </div>
        {!hasPreparation ? <Link href="/learn" className="hover:underline">{t('Set an olympiad and a date')}</Link> : null}
        <Link href="/me" className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          {t('Progress')} <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div role="progressbar" aria-label={t('XP today')} aria-valuenow={earned} aria-valuemin={0} aria-valuemax={xp.goal}
        className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-coral motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${share}%` }} />
      </div>
    </section>
  )
}
