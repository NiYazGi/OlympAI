'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { saveTrainingSettings } from '@/app/(app)/plan/settings/actions'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/i18n-provider'
import type { CompetitionOption } from '@/lib/types'
import type { getTrainingSettings, TrainingStage } from '@/lib/supabase/preparation-settings'

const DAYS = [{ day: 1, name: 'Пн' }, { day: 2, name: 'Вт' }, { day: 3, name: 'Ср' }, { day: 4, name: 'Чт' }, { day: 5, name: 'Пт' }, { day: 6, name: 'Сб' }, { day: 0, name: 'Вс' }]
const STAGES: { value: TrainingStage; label: string }[] = [
  { value: 'School', label: 'Школьный / районный' }, { value: 'Regional', label: 'Областной / региональный' },
  { value: 'National', label: 'Республиканский' }, { value: 'International', label: 'Международный' },
]
const input = 'w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60'
function duration(minutes: number) {
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
}

export function PreparationSettingsForm({ settings, competitions, subjects, today }: {
  settings: Awaited<ReturnType<typeof getTrainingSettings>>
  competitions: CompetitionOption[]
  subjects: { id: string; name: string; taskCount: number }[]
  today: string
}) {
  const t = useT()
  const id = useId()
  const [result, save, pending] = useActionState(saveTrainingSettings, null)
  const [subjectId, setSubjectId] = useState(settings.goal.subjectId ?? '')
  const [competitionId, setCompetitionId] = useState(settings.goal.competition?.id ?? '')
  const [stage, setStage] = useState(STAGES.some((item) => item.value === settings.preferences.stage)
    ? settings.preferences.stage! : STAGES.some((item) => item.value === settings.goal.competition?.level) ? settings.goal.competition!.level! : 'National')
  const [date, setDate] = useState(settings.goal.targetDate ?? '')
  const [grade, setGrade] = useState(settings.preferences.schoolGrade?.toString() ?? '')
  const [days, setDays] = useState(settings.preferences.weekdays)
  const [minutes, setMinutes] = useState(settings.preferences.sessionMinutes.toString())
  const [dailyMax, setDailyMax] = useState((settings.preferences.dailyTasks ?? 5).toString())
  const [reviewPercent, setReviewPercent] = useState(settings.preferences.reviewPercent)
  const [desiredResult, setDesiredResult] = useState(settings.desiredResult)
  const [why, setWhy] = useState(settings.why)
  const [confirmedWeeklyMinutes, setConfirmedWeeklyMinutes] = useState<number | null>(null)
  const [telegramEnabled, setTelegramEnabled] = useState(settings.telegramLinked && settings.preferences.telegramReflectionEnabled)
  const weeklyMinutes = Math.max(0, Number(minutes) || 0) * days.length
  const previousWeeklyMinutes = settings.preferences.weekdays.length * settings.preferences.sessionMinutes
  const increased = weeklyMinutes > previousWeeklyMinutes
  const available = competitions.filter((entry) => !entry.subjectId || entry.subjectId === subjectId)
  const chosen = available.find((entry) => entry.id === competitionId)
  const after = (dayCount: number) => new Date(Date.parse(`${today}T00:00:00Z`) + dayCount * 86_400_000).toISOString().slice(0, 10)

  return <form action={save} className="space-y-6" aria-busy={pending}>
    <fieldset disabled={pending} className="space-y-4 rounded-2xl border border-border p-5 sm:p-6">
      <legend className="px-1 text-lg font-semibold">Цель подготовки</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="min-w-0 space-y-2 text-sm font-medium"><span>Предмет</span>
          <select name="subject_id" required value={subjectId} onChange={(event) => {
            const value = event.target.value
            setSubjectId(value)
            if (chosen?.subjectId && chosen.subjectId !== value) setCompetitionId('')
          }} className={input}>
            <option value="" disabled>Выбери предмет</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{t(subject.name)}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-2 text-sm font-medium"><span>Олимпиада</span>
          <select name="competition_id" required value={chosen?.id ?? ''} disabled={!subjectId} onChange={(event) => {
            setCompetitionId(event.target.value)
            const level = competitions.find((entry) => entry.id === event.target.value)?.level
            if (STAGES.some((item) => item.value === level)) setStage(level!)
          }} className={input}>
            <option value="" disabled>Выбери олимпиаду</option>
            {available.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium"><span>Этап / уровень отбора</span>
          <select name="competition_stage" value={stage} onChange={(event) => setStage(event.target.value)} className={input}>{STAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </label>
        <label className="space-y-2 text-sm font-medium"><span>Класс</span>
          <select name="school_grade" required value={grade} onChange={(event) => setGrade(event.target.value)} className={input}>
            <option value="" disabled>Уточни класс</option>{Array.from({ length: 7 }, (_, i) => i + 6).map((item) => <option key={item} value={item}>{item} класс</option>)}
          </select>
          {!settings.preferences.schoolGrade && settings.profileGrade ? <span className="block text-xs font-normal text-muted-foreground">В профиле: {t(settings.profileGrade)}. Для подбора задач нужен точный класс.</span> : null}
        </label>
      </div>
      <label className="block max-w-xs space-y-2 text-sm font-medium"><span>Дата цели</span><input name="target_date" type="date" required min={after(1)} max={after(730)} value={date} onChange={(event) => setDate(event.target.value)} className={input} /></label>
      <div className="flex flex-wrap gap-2 text-xs">{[{ days: 30, label: 'Через месяц' }, { days: 90, label: 'Через 3 месяца' }, { days: 180, label: 'Через полгода' }].map((item) => <button key={item.days} type="button" onClick={() => setDate(after(item.days))} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">{item.label}</button>)}</div>
      {chosen?.registrationUrl ? <a href={chosen.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary hover:underline">Проверить даты и этапы у организатора ↗</a> : null}
    </fieldset>

    <fieldset disabled={pending} className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
      <legend className="px-1 text-lg font-semibold">Посильная нагрузка</legend>
      <div><p id={`${id}-days`} className="text-sm font-medium">Дни занятий</p><div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-days`}>{DAYS.map((day) => <label key={day.day} className="cursor-pointer rounded-xl border border-border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/10">
        <input type="checkbox" name="weekday" value={day.day} checked={days.includes(day.day)} onChange={(event) => setDays(event.target.checked ? [...days, day.day].sort((a, b) => a - b) : days.filter((value) => value !== day.day))} className="mr-2 accent-primary" />{day.name}
      </label>)}</div></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium"><span>Минут на одно занятие</span><input name="session_minutes" type="number" min={15} max={360} step={5} required value={minutes} onChange={(event) => setMinutes(event.target.value)} className={input} /><span className="block text-xs font-normal text-muted-foreground">Всё занятие целиком: теория, задачи и разбор.</span></label>
        <label className="space-y-2 text-sm font-medium"><span>Максимум задач за занятие</span><input name="daily_tasks" type="number" min={1} max={10} required value={dailyMax} onChange={(event) => setDailyMax(event.target.value)} className={input} /><span className="block text-xs font-normal text-muted-foreground">Это предел, а не обязательная норма. Сложная задача может занять несколько занятий.</span></label>
      </div>
      <label className="block space-y-2 text-sm font-medium"><span>Доля времени на разбор — {reviewPercent}%</span><input name="review_percent" type="range" min={10} max={50} step={5} value={reviewPercent} onChange={(event) => setReviewPercent(Number(event.target.value))} className="block w-full accent-primary" /><span className="block text-xs font-normal text-muted-foreground">Разбор уже входит в выбранные минуты; он не добавляется поверх бюджета.</span></label>
      <div className="rounded-xl bg-muted px-4 py-3 text-sm"><span className="font-semibold tabular-nums">{duration(weeklyMinutes)} в неделю</span><p className="mt-1 text-xs leading-relaxed text-muted-foreground">План ограничен этим временем. За 4–5 дней до цели нагрузка снижается; последние два дня — отдых. Пропуск не превращается в дополнительный долг.</p></div>
      {increased ? <label className="flex items-start gap-3 rounded-xl border border-primary/30 p-4 text-sm"><input type="checkbox" name="confirm_increase" required checked={confirmedWeeklyMinutes === weeklyMinutes} onChange={(event) => setConfirmedWeeklyMinutes(event.target.checked ? weeklyMinutes : null)} className="mt-0.5 size-4 shrink-0 accent-primary" /><span>Я согласен увеличить неделю с {duration(previousWeeklyMinutes)} до {duration(weeklyMinutes)}. Система не добавляет эти часы сама.</span></label> : null}
    </fieldset>

    <fieldset id="personal-goal" disabled={pending} className="scroll-mt-6 space-y-4 rounded-2xl border border-border p-5 sm:p-6">
      <legend className="px-1 text-lg font-semibold">Моя личная цель</legend>
      <p className="text-sm leading-relaxed text-muted-foreground">Эта запись видна только тебе. Можно дополнить её позже; прежние версии сохранятся, чтобы ты мог вернуться к своей мотивации.</p>
      <label className="block space-y-2 text-sm font-medium"><span>Какой результат я хочу получить</span><textarea name="desired_result" maxLength={1000} value={desiredResult} onChange={(event) => setDesiredResult(event.target.value)} rows={2} placeholder="Например: выйти в республиканский этап и уверенно решить геометрию" className={input} /></label>
      <label className="block space-y-2 text-sm font-medium"><span>Зачем мне это нужно</span><textarea name="personal_why" maxLength={2000} value={why} onChange={(event) => setWhy(event.target.value)} rows={4} placeholder="Напиши своими словами. Эту запись можно перечитать в трудный день." className={input} /></label>
    </fieldset>

    {settings.telegramLinked ? <fieldset disabled={pending} className="space-y-3 rounded-2xl border border-border p-5 sm:p-6"><legend className="px-1 text-lg font-semibold">По желанию — в Telegram</legend><label className="flex items-start gap-3 text-sm"><input type="checkbox" name="telegram_reflection_enabled" checked={telegramEnabled} onChange={(event) => setTelegramEnabled(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" /><span>Хочу добровольную самооценку пяти направлений в Telegram</span></label><p className="text-xs leading-relaxed text-muted-foreground">Загруженность, решение, теория, ментальное состояние и сон. Это необязательная личная отметка; критерии Темирлан агая ещё не утверждены.</p></fieldset> : null}

    {result ? <div role={result.ok ? 'status' : 'alert'} className="rounded-xl bg-muted px-4 py-3 text-sm">{result.ok ? <span className="flex items-center gap-2"><Check aria-hidden className="size-4" />Настройки и личная цель сохранены. Программа пересчитана в пределах выбранного времени.</span> : result.error}</div> : null}
    <div className="flex flex-wrap gap-3"><Button type="submit" size="lg" className="h-auto min-h-11 max-w-full whitespace-normal text-center" disabled={pending || !chosen || !subjectId || !date || !grade || !days.length || (increased && confirmedWeeklyMinutes !== weeklyMinutes)}>{pending ? <><Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />Сохраняем…</> : 'Сохранить настройки и пересчитать план'}</Button><Link href="/plan" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Открыть программу<ArrowRight aria-hidden className="size-4" /></Link></div>
  </form>
}
