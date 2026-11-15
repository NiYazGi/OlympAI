'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { markLessonOpened, setLessonComplete } from '@/app/(app)/learn/actions'
import { Button } from '@/components/ui/button'
import type { Lesson } from '@/lib/types'
import { cardClass, cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'
import { LESSON_XP } from '@/lib/xp'

/**
 * A lesson, as blocks rather than a page of prose.
 *
 * The format is the teaching decision: an idea, why it holds, one worked case,
 * and the short list worth memorising. Long enough to say something, short
 * enough that the check step follows while it is still in mind.
 */
export function LessonReader({ lesson, children, sessionId, dayCompleted, practiceHref, timeboxed }: {
  lesson: Lesson
  children: ReactNode
  sessionId?: string
  dayCompleted?: boolean
  practiceHref?: string
  timeboxed?: boolean
}) {
  const t = useT()

  const router = useRouter()
  const [completed, setCompleted] = useState(sessionId ? Boolean(dayCompleted) : Boolean(lesson.completedAt))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Recorded once, on arrival. "Opened" is a fact about this student's reading
  // and the only one available without asking them to grade themselves.
  useEffect(() => {
    if (!lesson.openedAt) void markLessonOpened(lesson.id)
  }, [lesson.id, lesson.openedAt])

  function toggle() {
    setError('')
    const next = !completed
    setCompleted(next)
    startTransition(async () => {
      const result = await setLessonComplete(lesson.id, next, sessionId)
      if (!result.ok) { setCompleted(!next); setError(result.error ?? 'Не удалось сохранить отметку. Попробуй ещё раз.') }
      else router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {children}

      <div className={cn(cardClass, 'flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5')}>
        <div>
          <p className="font-medium">{completed ? timeboxed ? 'Сегодняшняя часть отмечена' : t('Marked as read.') : timeboxed ? 'Закончил сегодняшнюю часть?' : t('Finished reading?')}</p>
          <p className="text-sm text-muted-foreground">
            {timeboxed ? 'Часть входит в маршрут. Полное прочтение конспекта засчитывается после всех его частей.' : t('The first completion earns {n} XP.', { n: LESSON_XP })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={completed ? 'outline' : 'default'} onClick={toggle} disabled={pending}>
            {completed ? t('Not yet') : <><Check className="size-4" /> {t('Mark as read')}</>}
          </Button>
          <Button
            variant="secondary"
            nativeButton={false}
            render={
              <Link href={practiceHref ?? ('/learn/' + lesson.topicSlug + '/quiz')} prefetch>
                {timeboxed ? 'К занятию' : t(practiceHref ? 'Start daily practice' : 'Check yourself')}
              </Link>
            }
          />
        </div>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-muted p-4 text-sm">{error}</p> : null}
    </div>
  )
}
