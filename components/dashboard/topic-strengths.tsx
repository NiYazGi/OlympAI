import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getT } from '@/lib/i18n/server'
import type { ProgressAnalytics } from '@/lib/types'
import styles from './topic-strengths.module.css'

const MIN_ATTEMPTS = 3
const RATING = {
  strong: 'Strong topic',
  practice: 'Needs practice',
  steady: 'Steady progress',
  early: 'Too few attempts',
}

function TopicColumn({ mastery }: { mastery: number }) {
  const base = 110
  const top = base - mastery * 0.9

  return (
    <svg aria-hidden viewBox="0 0 96 118" className={styles.column}>
      <path className={styles.range} d="M19 110V20L32 12H83V102L70 110ZM19 20H70L83 12M70 20V110" />
      <path className={styles.front} d={`M19 ${base}V${top}H70V${base}Z`} />
      <path className={styles.side} d={`M70 ${base}V${top}L83 ${top - 8}V${base - 8}Z`} />
      <path className={styles.top} d={`M19 ${top}L32 ${top - 8}H83L70 ${top}Z`} />
    </svg>
  )
}

export async function TopicStrengths({ topics }: { topics: ProgressAnalytics['topics'] }) {
  const t = await getT()
  const ranked = [...topics].sort((a, b) => b.mastery - a.mastery || b.attempts - a.attempts)

  return (
    <section aria-labelledby="topic-strengths-heading" className="border-t border-border pt-5 sm:pt-6">
      <h2 id="topic-strengths-heading" className="text-lg font-semibold tracking-tight">
        {t('Strengths and areas to practise')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('Share of correct solutions by topic.')}</p>
      {ranked.length ? (
        <>
          <ul className={styles.chart}>
            {ranked.map(({ topic, slug, mastery, attempts, correct }) => {
              const rating = attempts < MIN_ATTEMPTS ? 'early' : mastery >= 85 ? 'strong' : mastery < 70 ? 'practice' : 'steady'
              return (
                <li key={topic} className="min-w-0">
                  <Link href={slug ? `/learn/${slug}?evidence=attempts#route-evidence` : `/tasks?topic=${encodeURIComponent(topic)}`} prefetch={false} data-rating={rating} className={styles.topic}>
                    <span className="text-xl font-semibold tabular-nums">{mastery}%</span>
                    <TopicColumn mastery={mastery} />
                    <span className="text-sm font-medium break-words">{t(topic)}</span>
                    <span className="text-xs text-muted-foreground">{t(RATING[rating])}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{t('{correct} of {total} correct', { correct, total: attempts })}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Оценка точности появляется после 3 попыток. Нажми на тему, чтобы увидеть решения и даты. Это не процент освоения навыков.
          </p>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-muted/60 px-4 py-3 text-sm">
          <p className="text-muted-foreground">{t('Your results will appear after your first graded solution.')}</p>
          <Link href="/tasks?list=1" className="inline-flex items-center gap-1.5 font-medium text-coral hover:underline">
            {t('View problems')} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      )}
    </section>
  )
}
