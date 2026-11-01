import Link from 'next/link'
import { getLocale, getT } from '@/lib/i18n'
import { formatDay } from '@/lib/i18n/config'
import { MAX_POINTS, SIGN } from '@/lib/protocol'
import type { AttemptSummary } from '@/lib/supabase/queries'
import { cardClass, cn, labelClass } from '@/lib/utils'

/**
 * Every attempt at one problem, newest first, each opening its own protocol.
 *
 * Progress on a single problem is the most legible progress there is: the same
 * statement, a second try, a sign that moved from ∓ to ±. A total across the
 * whole library says less than that.
 */
export async function AttemptList({
  taskId,
  attempts,
  current,
}: {
  taskId: string
  attempts: AttemptSummary[]
  /** The attempt on screen, when this list sits beside one. */
  current?: string
}) {
  const [t, locale] = await Promise.all([getT(), getLocale()])

  return (
    <section className={cn(cardClass, 'p-5')}>
      <h2 className={labelClass}>{t.protocol.attempts}</h2>
      {attempts.length === 0 ? (
        <p className="mt-2 text-ui text-muted-foreground">{t.protocol.noAttempts}</p>
      ) : (
        <ol className="mt-2 flex flex-col">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/tasks/${taskId}/attempts/${attempt.id}`}
                aria-current={attempt.id === current ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60 pointer-coarse:min-h-11',
                  attempt.id === current && 'bg-accent',
                )}
              >
                <span className="w-5 shrink-0 text-center font-mono text-ui text-primary" aria-hidden>
                  {SIGN[attempt.verdict]}
                </span>
                <span className="min-w-0 flex-1 truncate text-ui">{t.solve.verdict[attempt.verdict]}</span>
                <span className="shrink-0 font-mono text-ui tabular-nums">
                  {attempt.points} / {MAX_POINTS}
                </span>
                <span className="w-24 shrink-0 text-right text-caption text-muted-foreground">
                  {formatDay(attempt.createdAt.slice(0, 10), locale)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
