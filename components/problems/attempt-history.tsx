'use client'

import Link from 'next/link'
import { ChevronDown, CornerUpLeft, FileText } from 'lucide-react'
import { VERDICT_LABEL } from '@/components/problems/attempt-protocol'
import { ReportIssue } from '@/components/problems/report-issue'
import { Button } from '@/components/ui/button'
import { useLocale, useT } from '@/components/i18n-provider'
import { formatDate } from '@/lib/i18n/config'
import { MAX_POINTS, SIGN } from '@/lib/protocol'
import { saveDraft } from '@/lib/task-draft'
import type { TaskAttemptEntry, TaskReportEntry } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'

/**
 * Every submission to this task, newest first: what was written, the score and
 * what the grader said. The page used to keep only a count and a best score, so
 * after a break there was no way to see what had been wrong or to carry on
 * from it.
 */
export function AttemptHistory({
  taskId,
  attempts,
  reports,
}: {
  taskId: string
  attempts: TaskAttemptEntry[]
  reports: TaskReportEntry[]
}) {
  const t = useT()
  const locale = useLocale()
  if (attempts.length === 0 && reports.length === 0) return null

  const reported = new Set(reports.map((report) => report.attemptId).filter(Boolean))

  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="eyebrow">{t('Your attempts')}</h2>
      <ul className="mt-3 space-y-2">
        {attempts.map((attempt, index) => (
          <li key={attempt.id}>
            <details className="group rounded-lg bg-white/[0.03] ring-1 ring-foreground/10" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm">
                <span className="w-4 shrink-0 text-center font-mono text-white" aria-hidden>
                  {SIGN[attempt.verdict]}
                </span>
                <span
                  className={cn(
                    'font-mono font-semibold tabular-nums',
                    attempt.isCorrect ? 'text-success' : 'text-foreground',
                  )}
                >
                  {attempt.points}/{MAX_POINTS}
                </span>
                <span className="min-w-0 truncate text-muted-foreground">
                  {t(VERDICT_LABEL[attempt.verdict])} ·{' '}
                  {formatDate(new Date(attempt.createdAt), locale, { day: 'numeric', month: 'short' })}
                </span>
                <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-foreground/10 px-3 py-3">
                {attempt.feedback ? (
                  <p className="text-sm leading-relaxed text-foreground/90">{attempt.feedback}</p>
                ) : null}
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-void p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                  {attempt.answer}
                </pre>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link href={`/tasks/${taskId}/attempts/${attempt.id}`}>
                        <FileText className="size-3.5" /> {t('Open the review')}
                      </Link>
                    }
                  />
                  <Button size="sm" variant="outline" onClick={() => saveDraft(taskId, attempt.answer)}>
                    <CornerUpLeft className="size-3.5" /> {t('Put back in the editor')}
                  </Button>
                  {reported.has(attempt.id) ? null : (
                    <ReportIssue taskId={taskId} attemptId={attempt.id} kind="grading" />
                  )}
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {reports.length ? (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t('Your reports')}</h3>
          {reports.map((report) => (
            <div key={report.id} className="rounded-lg bg-white/[0.03] p-3 text-sm ring-1 ring-foreground/10">
              <p className="text-xs text-muted-foreground">
                {report.kind === 'grading' ? t('Check') : t('Statement')} ·{' '}
                {report.status === 'open'
                  ? t('Under review')
                  : report.status === 'resolved'
                    ? t('Fixed')
                    : t('Reviewed, no change')}
              </p>
              <p className="mt-1 text-foreground/90">{report.message}</p>
              {report.resolution ? (
                <p className="mt-2 rounded-md bg-accent p-2 text-accent-foreground">{report.resolution}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
