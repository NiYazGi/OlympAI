'use client'

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Moon, RotateCcw, Timer, Trophy } from 'lucide-react'
import { useLocale } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { LOCALE_TAGS } from '@/lib/i18n/config'
import type { PreparationPhase } from '@/lib/preparation-phases'
import type { DailySession, TrainingCalendarDay } from '@/lib/supabase/daily-preparation'
import styles from './calendar.module.css'

const COPY = {
  ru: {
    title: 'Календарь подготовки', intro: 'Занятия, пробники, разборы и отдых — в пределах выбранного времени.',
    today: 'Сегодня', goal: 'Цель', previous: 'Предыдущий месяц', next: 'Следующий месяц',
    selected: 'Выбранный день', available: 'Осталось времени', planned: 'Назначено', completed: 'Выполнено', min: 'мин',
    study: 'Занятие', mock: 'Пробный тур', review: 'Разбор', rest: 'Отдых', off: 'Свободный день', missed: 'Перепланировано',
    empty: 'На этот день занятие не назначено.', open: 'Открыть занятие', history: 'Посмотреть запись',
    theory: 'Теория', task: 'Задача', quiz: 'Квиз', reinforce: 'Разбор и закрепление', paperReview: 'Разбор пробника',
    timed: 'Практика с таймером', fullPaper: 'Полный пробный тур', part: 'часть', finished: 'Занятие завершено',
    goalNote: 'День олимпиады. Дополнительных учебных заданий нет.',
    restNote: 'Последние два дня — отдых. Пробников и обязательных занятий нет.',
    taperNote: 'Снижение нагрузки: только спокойный разбор и повторение, без новых сложных задач.',
    missedNote: 'Следующие занятия пересчитаны под доступное время. Долг за пропуск не добавляется.',
    phases: 'Фазы подготовки', noDebt: 'Часы не увеличиваются автоматически. Пропуски меняют будущий план, а не добавляют бесконечный долг.',
    phase: { foundation: 'База', strengthening: 'Усиление', competition: 'Соревновательная практика', taper: 'Снижение нагрузки', rest: 'Отдых' },
  },
  kk: {
    title: 'Дайындық күнтізбесі', intro: 'Сабақтар, сынақтар, талдау және демалыс — таңдаған уақыт шегінде.',
    today: 'Бүгін', goal: 'Мақсат', previous: 'Алдыңғы ай', next: 'Келесі ай',
    selected: 'Таңдалған күн', available: 'Қалған уақыт', planned: 'Жоспарланған', completed: 'Орындалды', min: 'мин',
    study: 'Сабақ', mock: 'Сынақ туры', review: 'Талдау', rest: 'Демалыс', off: 'Бос күн', missed: 'Қайта жоспарланды',
    empty: 'Бұл күнге сабақ жоспарланбаған.', open: 'Сабақты ашу', history: 'Жазбаны көру',
    theory: 'Теория', task: 'Есеп', quiz: 'Квиз', reinforce: 'Талдау және бекіту', paperReview: 'Сынақты талдау',
    timed: 'Таймермен жаттығу', fullPaper: 'Толық сынақ туры', part: 'бөлік', finished: 'Сабақ аяқталды',
    goalNote: 'Олимпиада күні. Қосымша оқу тапсырмалары жоқ.',
    restNote: 'Соңғы екі күн — демалыс. Сынақтар мен міндетті сабақтар жоқ.',
    taperNote: 'Жүктемені азайту: жаңа күрделі есептерсіз, тыныш талдау және қайталау.',
    missedNote: 'Келесі сабақтар қолжетімді уақытқа сай қайта жоспарланды. Өткізілген күн үшін қарыз қосылмайды.',
    phases: 'Дайындық кезеңдері', noDebt: 'Сағаттар автоматты түрде артпайды. Өткізілген сабақтар болашақ жоспарды өзгертеді, шексіз қарыз қоспайды.',
    phase: { foundation: 'Негіз', strengthening: 'Күшейту', competition: 'Жарыс тәжірибесі', taper: 'Жүктемені азайту', rest: 'Демалыс' },
  },
  en: {
    title: 'Preparation calendar', intro: 'Study, mock tests, review and rest — within your agreed time.',
    today: 'Today', goal: 'Goal', previous: 'Previous month', next: 'Next month',
    selected: 'Selected day', available: 'Time remaining', planned: 'Assigned', completed: 'Completed', min: 'min',
    study: 'Study', mock: 'Mock test', review: 'Review', rest: 'Rest', off: 'Day off', missed: 'Rescheduled',
    empty: 'No session is assigned to this day.', open: 'Open session', history: 'View record',
    theory: 'Theory', task: 'Problem', quiz: 'Quiz', reinforce: 'Review and consolidation', paperReview: 'Mock review',
    timed: 'Timed practice', fullPaper: 'Full mock paper', part: 'part', finished: 'Session completed',
    goalNote: 'Olympiad day. No extra study is assigned.',
    restNote: 'The final two days are for rest, with no mock tests or compulsory sessions.',
    taperNote: 'Reduced workload: calm review and revision, with no new hard problems.',
    missedNote: 'Upcoming sessions were recalculated within your available time. No missed-work debt was added.',
    phases: 'Preparation phases', noDebt: 'Your hours never increase automatically. Missed sessions reshape future study instead of creating endless debt.',
    phase: { foundation: 'Foundation', strengthening: 'Strengthening', competition: 'Competition practice', taper: 'Taper', rest: 'Rest' },
  },
}
const DAY = 86_400_000
const stamp = (date: string) => Date.parse(`${date}T00:00:00Z`)
const iso = (date: Date) => date.toISOString().slice(0, 10)
const monthStart = (date: string) => date.slice(0, 7) + '-01'
const PHASES: PreparationPhase[] = ['foundation', 'strengthening', 'competition', 'taper', 'rest']

/** Read-only calendar. Session changes are made on the individual session page. */
export function PreparationCalendar({ days, today, targetDate }: {
  days: TrainingCalendarDay[]
  today: string
  targetDate: string
}) {
  const locale = useLocale()
  const copy = COPY[locale]
  const detailsId = useId()
  const dateMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days])
  const range = useMemo(() => [...new Set([...days.map((day) => day.date), targetDate])].sort(), [days, targetDate])
  const first = range[0] ?? today
  const last = range[range.length - 1] ?? targetDate
  const clamp = (date: string) => date < first ? first : date > last ? last : date
  const [selected, setSelected] = useState(() => clamp(today))
  const focusNext = useRef(false)
  const cells = useRef(new Map<string, HTMLButtonElement>())
  const safeSelected = clamp(selected)
  const chosen = dateMap.get(safeSelected)
  const month = new Date(stamp(monthStart(safeSelected)))
  const monthLabel = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month)
  const fullDate = (date: string) => new Intl.DateTimeFormat(LOCALE_TAGS[locale], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(stamp(date)))
  const weekday = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { weekday: 'short', timeZone: 'UTC' })
  const offset = (month.getUTCDay() + 6) % 7
  const monthDays = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate()
  const rows = Math.ceil((offset + monthDays) / 7)
  const previousDisabled = monthStart(safeSelected) <= monthStart(first)
  const nextDisabled = monthStart(safeSelected) >= monthStart(last)

  useEffect(() => {
    if (!focusNext.current) return
    cells.current.get(safeSelected)?.focus()
    focusNext.current = false
  }, [safeSelected])

  const kindName = (day: TrainingCalendarDay | undefined) => !day ? copy.empty : {
    study: copy.study, mock: copy.mock, review: copy.review, rest: copy.rest,
    'day-off': copy.off, missed: copy.missed, goal: copy.goal,
  }[day.kind]

  function choose(date: string, focus = false) {
    focusNext.current = focus
    setSelected(clamp(date))
  }
  function moveMonth(delta: number, focus = false) {
    const previousDay = new Date(stamp(safeSelected)).getUTCDate()
    const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + delta, 1))
    const length = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
    next.setUTCDate(Math.min(previousDay, length))
    choose(iso(next), focus)
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const day = new Date(stamp(date))
    let next = stamp(date)
    if (event.key === 'ArrowLeft') next -= DAY
    else if (event.key === 'ArrowRight') next += DAY
    else if (event.key === 'ArrowUp') next -= 7 * DAY
    else if (event.key === 'ArrowDown') next += 7 * DAY
    else if (event.key === 'Home') next -= ((day.getUTCDay() + 6) % 7) * DAY
    else if (event.key === 'End') next += (6 - (day.getUTCDay() + 6) % 7) * DAY
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      moveMonth(event.key === 'PageUp' ? -1 : 1, true)
      return
    } else return
    event.preventDefault()
    choose(iso(new Date(next)), true)
  }

  const sessions = (chosen?.sessions ?? []).filter((session) => !session.superseded_at || session.completed_at || session.skipped_at)
  function allocation(session: DailySession) {
    const portions: { key: string; label: string; minutes: number; part?: number; parts?: number }[] = []
    if (session.session_kind === 'mock') return [{ key: 'mock', label: session.full_paper ? copy.fullPaper : copy.timed, minutes: session.minutes }]
    if (session.lesson_minutes > 0) portions.push({ key: 'lesson', label: copy.theory, minutes: session.lesson_minutes, part: session.lesson_part, parts: session.lesson_parts })
    session.task_ids.forEach((taskId, index) => {
      if (session.task_minutes[index] > 0) portions.push({ key: taskId, label: `${copy.task} ${index + 1}`, minutes: session.task_minutes[index], part: session.task_parts[index], parts: session.task_part_totals[index] })
    })
    if (session.quiz_minutes > 0) portions.push({ key: 'quiz', label: copy.quiz, minutes: session.quiz_minutes, part: session.quiz_part, parts: session.quiz_parts })
    if (session.review_minutes > 0) portions.push({ key: 'review', label: session.review_mock_key ? copy.paperReview : copy.reinforce, minutes: session.review_minutes, part: session.review_part, parts: session.review_parts })
    return portions
  }

  return <section id="training-calendar" aria-labelledby={`${detailsId}-title`} className={styles.calendar}>
    <div className={styles.heading}>
      <div><h2 id={`${detailsId}-title`} className="text-xl font-semibold tracking-tight">{copy.title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.intro}</p></div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="outline" disabled={today < first || today > last} onClick={() => choose(today)}>{copy.today}</Button>
        <Button size="sm" variant="outline" onClick={() => choose(targetDate)}><Trophy aria-hidden />{copy.goal}</Button>
      </div>
    </div>
    <div className={styles.layout}>
      <div className={styles.month}>
        <div className={styles.monthHeading}>
          <Button size="icon-sm" variant="ghost" disabled={previousDisabled} aria-label={copy.previous} onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden /></Button>
          <h3 aria-live="polite" className="text-sm font-semibold first-letter:uppercase">{monthLabel}</h3>
          <Button size="icon-sm" variant="ghost" disabled={nextDisabled} aria-label={copy.next} onClick={() => moveMonth(1)}><ChevronRight aria-hidden /></Button>
        </div>
        <table className={styles.table} aria-label={monthLabel}>
          <thead><tr>{Array.from({ length: 7 }, (_, index) => <th key={index} scope="col">{weekday.format(new Date(Date.UTC(2024, 0, index + 1)))}</th>)}</tr></thead>
          <tbody key={monthStart(safeSelected)}>{Array.from({ length: rows }, (_, week) => <tr key={week}>{Array.from({ length: 7 }, (_, index) => {
            const number = week * 7 + index - offset + 1
            if (number < 1 || number > monthDays) return <td key={index} />
            const date = iso(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), number)))
            const day = dateMap.get(date)
            const disabled = date < first || date > last
            const finished = (day?.completedMinutes ?? 0) > 0
            return <td key={index}><button type="button" className={styles.day} disabled={disabled}
              ref={(node) => { if (node) cells.current.set(date, node); else cells.current.delete(date) }}
              tabIndex={date === safeSelected ? 0 : -1} aria-pressed={date === safeSelected}
              aria-current={date === today ? 'date' : undefined} aria-controls={detailsId}
              aria-label={`${fullDate(date)} · ${kindName(day)}${day?.plannedMinutes ? ` · ${day.plannedMinutes} ${copy.min}` : ''}${finished ? ` · ${copy.completed}: ${day?.completedMinutes} ${copy.min}` : ''}`}
              data-kind={day?.kind} data-finished={finished || undefined} onClick={() => choose(date)} onKeyDown={(event) => navigate(event, date)}>
              <time dateTime={date} className={styles.number}>{number}</time>
              <span className={styles.dayMark} aria-hidden>{day?.kind === 'goal' ? <Trophy /> : day?.kind === 'mock' ? <Timer /> : day?.kind === 'review' || day?.kind === 'missed' ? <RotateCcw /> : finished ? <Check /> : day?.kind === 'rest' || day?.kind === 'day-off' ? <Moon /> : day?.plannedMinutes ? <span className={styles.dot} /> : null}</span>
              <span className={styles.dayMinutes} aria-hidden>{day?.plannedMinutes ? `${day.plannedMinutes} ${copy.min}` : finished ? `${day?.completedMinutes} ${copy.min}` : day?.kind === 'goal' ? copy.goal : ''}</span>
            </button></td>
          })}</tr>)}</tbody>
        </table>
        <div className={styles.kindLegend} aria-label={copy.title}>
          <span><i className={styles.dot} />{copy.study}</span><span><Timer aria-hidden />{copy.mock}</span><span><RotateCcw aria-hidden />{copy.review}</span><span><Moon aria-hidden />{copy.rest}</span>
        </div>
      </div>
      <section id={detailsId} className={styles.details} aria-label={copy.selected}>
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-semibold first-letter:uppercase">{fullDate(safeSelected)}</h3>{chosen ? <span className={styles.phase}>{copy.phase[chosen.phase]}</span> : null}</div>
        <div className={styles.dayTotals}>
          {chosen?.plannedMinutes ? <span>{copy.planned}: <strong>{chosen.plannedMinutes} {copy.min}</strong></span> : null}
          {chosen && chosen.completedMinutes > 0 ? <span>{copy.completed}: <strong>{chosen.completedMinutes} {copy.min}</strong></span> : null}
          {chosen && safeSelected >= today && chosen.kind !== 'goal' && chosen.capacityMinutes > 0 ? <span>{copy.available}: {chosen.capacityMinutes} {copy.min}</span> : null}
        </div>
        {chosen?.kind === 'goal' ? <p className={styles.notice}>{copy.goalNote}</p> : chosen?.phase === 'rest' && chosen.daysLeft <= 2 ? <p className={styles.notice}>{copy.restNote}</p> : chosen?.kind === 'missed' ? <p className={styles.notice}>{copy.missedNote}</p> : chosen?.phase === 'taper' ? <p className={styles.notice}>{copy.taperNote}</p> : null}
        {sessions.length ? <ul className={styles.sessions}>{sessions.map((session) => <li key={session.id} className={styles.session} data-status={session.skipped_at ? 'rescheduled' : session.completed_at ? 'completed' : 'planned'}>
          <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{session.skipped_at ? copy.missed : session.completed_at ? copy.finished : session.session_kind === 'mock' ? copy.mock : session.session_kind === 'review' ? copy.review : copy.study}</p><span className="shrink-0 text-sm font-semibold tabular-nums">{session.completed_at ? session.actual_minutes ?? session.minutes : session.minutes} {copy.min}</span></div>
          <ul className={styles.allocations}>{allocation(session).map((item) => <li key={item.key}><span>{item.label}{(item.parts ?? 0) > 1 ? ` · ${copy.part} ${item.part}/${item.parts}` : ''}</span><span>{item.minutes} {copy.min}</span></li>)}</ul>
          <Link href={`/plan/session/${session.id}`} className={styles.sessionLink}>{session.completed_at || session.skipped_at ? copy.history : copy.open}<ArrowRight aria-hidden /></Link>
        </li>)}</ul> : chosen?.kind !== 'goal' && chosen?.phase !== 'rest' ? <p className="mt-4 text-sm text-muted-foreground">{copy.empty}</p> : null}
      </section>
    </div>
    <div className={styles.phases}><h3 className="text-xs font-medium text-muted-foreground">{copy.phases}</h3><ol>{PHASES.map((phase, index) => <li key={phase}><span aria-hidden>{index + 1}</span>{copy.phase[phase]}</li>)}</ol></div>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.noDebt}</p>
  </section>
}

export { PreparationCalendar as TrainingCalendar }
