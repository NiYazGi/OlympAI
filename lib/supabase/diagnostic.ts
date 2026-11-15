import 'server-only'

import { createHash } from 'node:crypto'
import { cache } from 'react'
import { getDb } from '@/lib/db'
import { getSessionUserId } from '@/lib/supabase/auth'
import { getCurrentProfile, getGoal, getPreparationSettings } from '@/lib/supabase/queries'
import { DIAGNOSTIC_MINUTES, DIAGNOSTIC_VERSION, diagnosticQuestions, publicDiagnosticQuestions, scoreDiagnostic, type DiagnosticAnswers, type DiagnosticReport, type DiagnosticResult } from '@/lib/diagnostic'

export type DiagnosticMutationResult = { ok: boolean; error?: string; hint?: string }

export type DiagnosticRow = {
  id: string; user_id: string; subject: string; school_grade: string | null; scope: string; version: string
  answers: DiagnosticAnswers; self_report: DiagnosticReport | null; result: DiagnosticResult | null
  goal_snapshot: { competitionId: string | null; name: string | null; date: string | null }
  estimated_minutes: number; started_at: string; completed_at: string | null
}
export const diagnosticDay = (value: string | Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

export const getDiagnosticContext = cache(async () => {
  const userId = await getSessionUserId()
  if (!userId) return null
  const [profile, goal, settings] = await Promise.all([getCurrentProfile(), getGoal(), getPreparationSettings()])
  if (!profile || profile.role === 'teacher' || !goal.subjectName || !diagnosticQuestions(goal.subjectName).length) return null
  const grade = settings.preferences.schoolGrade ? String(settings.preferences.schoolGrade) : profile.grade
  const scope = createHash('sha256').update(JSON.stringify([goal.subjectName, grade, DIAGNOSTIC_VERSION])).digest('hex')
  return { userId, subject: goal.subjectName, grade, scope, snapshot: { competitionId: goal.competition?.id ?? null, name: goal.competition?.name ?? goal.subjectName, date: goal.targetDate } }
})

export const getDiagnosticProfile = cache(async (subject: string) => {
  const context = await getDiagnosticContext()
  const empty = scoreDiagnostic(subject, {}, { assistance: 'alone', note: '' })
  const initialDimensions = Object.fromEntries(Object.entries(empty.dimensions).map(([key, value]) => [key, { ...value, score: null, answered: 0, basis: 'none' as const }])) as DiagnosticResult['dimensions']
  const base = {
    id: null as string | null, subject, grade: context?.grade ?? null, scope: context?.scope ?? null,
    completedAt: null as string | null, startedAt: null as string | null,
    estimatedMinutes: DIAGNOSTIC_MINUTES, studyMinutes: DIAGNOSTIC_MINUTES,
    studyDate: diagnosticDay(new Date()), minutesBasis: 'estimate' as const,
    dimensions: initialDimensions, weakSkillIds: [] as string[], strongSkillIds: [] as string[],
    skillScores: {} as Record<string, number>, skillChecks: {} as DiagnosticResult['skillChecks'],
    evidence: [] as DiagnosticResult['evidence'], observedHints: 0, selfReport: null as DiagnosticReport | null,
    coverage: empty.coverage,
  }
  if (!context || context.subject !== subject) return base
  const db = await getDb()
  const { rows } = await db.query<DiagnosticRow>('select * from public.preparation_diagnostics where user_id=$1 and scope=$2 order by started_at desc,id desc limit 1', [context.userId, context.scope])
  const row = rows[0]
  if (!row) return base
  return { ...base, id: row.id, startedAt: row.started_at, completedAt: row.completed_at,
    studyDate: row.completed_at ? diagnosticDay(row.completed_at) : base.studyDate,
    ...(row.result ?? {}),
  }
})

async function insertRun(context: NonNullable<Awaited<ReturnType<typeof getDiagnosticContext>>>) {
  const db = await getDb()
  await db.query(`insert into public.preparation_diagnostics(user_id,subject,school_grade,scope,version,goal_snapshot,estimated_minutes)
    values ($1,$2,$3,$4,$5,$6::jsonb,$7)
    on conflict(user_id,scope) where completed_at is null do nothing`,
  [context.userId, context.subject, context.grade, context.scope, DIAGNOSTIC_VERSION, JSON.stringify(context.snapshot), DIAGNOSTIC_MINUTES])
}

export async function getDiagnosticSession() {
  const context = await getDiagnosticContext()
  if (!context) return null
  const db = await getDb()
  let { rows } = await db.query<DiagnosticRow>('select * from public.preparation_diagnostics where user_id=$1 and scope=$2 order by started_at desc,id desc limit 1', [context.userId, context.scope])
  if (!rows.length) {
    await insertRun(context)
    rows = (await db.query<DiagnosticRow>('select * from public.preparation_diagnostics where user_id=$1 and scope=$2 order by started_at desc,id desc limit 1', [context.userId, context.scope])).rows
  }
  const run = rows[0]
  return { run, questions: publicDiagnosticQuestions(context.subject), estimatedMinutes: DIAGNOSTIC_MINUTES }
}

export async function startDiagnosticRetake(): Promise<DiagnosticMutationResult> {
  const context = await getDiagnosticContext()
  if (!context) return { ok: false, error: 'Сначала выбери предмет подготовки.' }
  await insertRun(context)
  return { ok: true }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function updateDiagnosticAnswer(runId: string, questionId: string, choice: number | null, requestHint = false): Promise<DiagnosticMutationResult> {
  const context = await getDiagnosticContext()
  if (!context || !UUID.test(runId)) return { ok: false, error: 'Диагностика не найдена. Обнови страницу.' }
  const question = diagnosticQuestions(context.subject).find((item) => item.id === questionId)
  if (!question || (!requestHint && (choice === null || !Number.isInteger(choice) || choice < -1 || choice >= question.options.length))) {
    return { ok: false, error: 'Выбери один из предложенных ответов.' }
  }
  const db = await getDb()
  return db.transaction(async (tx) => {
    const row = (await tx.query<DiagnosticRow>('select * from public.preparation_diagnostics where id=$1 and user_id=$2 and scope=$3 and completed_at is null for update', [runId, context.userId, context.scope])).rows[0]
    if (!row) return { ok: false, error: 'Эта диагностика уже завершена или относится к другим настройкам.' }
    const previous = row.answers[questionId]
    const answers = { ...row.answers, [questionId]: { choice: requestHint ? previous?.choice ?? -2 : choice!, hintUsed: requestHint || Boolean(previous?.hintUsed) } }
    await tx.query('update public.preparation_diagnostics set answers=$3::jsonb where id=$1 and user_id=$2', [runId, context.userId, JSON.stringify(answers)])
    return requestHint ? { ok: true, hint: question.hint } : { ok: true }
  })
}

export async function submitDiagnostic(runId: string, report: DiagnosticReport): Promise<DiagnosticMutationResult> {
  const context = await getDiagnosticContext()
  if (!context || !UUID.test(runId)) return { ok: false, error: 'Диагностика не найдена.' }
  if (!['alone', 'small-help', 'guided'].includes(report.assistance) || typeof report.note !== 'string' || report.note.length > 5000) {
    return { ok: false, error: 'Проверь ответ о самостоятельности и длину пояснения.' }
  }
  const db = await getDb()
  return db.transaction(async (tx) => {
    const row = (await tx.query<DiagnosticRow>('select * from public.preparation_diagnostics where id=$1 and user_id=$2 and scope=$3 for update', [runId, context.userId, context.scope])).rows[0]
    if (!row) return { ok: false, error: 'Диагностика не найдена или настройки изменились.' }
    if (row.completed_at) return { ok: true }
    const questions = diagnosticQuestions(context.subject)
    if (questions.some((question) => !row.answers[question.id] || row.answers[question.id].choice < -1 || row.answers[question.id].choice >= question.options.length)) {
      return { ok: false, error: 'Пройди каждый вопрос или выбери «Пока не знаю».' }
    }
    const result = scoreDiagnostic(context.subject, row.answers, { assistance: report.assistance, note: report.note.trim() })
    await tx.query('update public.preparation_diagnostics set self_report=$3::jsonb,result=$4::jsonb,completed_at=now() where id=$1 and user_id=$2', [runId, context.userId, JSON.stringify(result.selfReport), JSON.stringify(result)])
    return { ok: true }
  })
}

export async function getDiagnosticHistory() {
  const context = await getDiagnosticContext()
  if (!context) return []
  const db = await getDb()
  const { rows } = await db.query<Pick<DiagnosticRow, 'id' | 'completed_at' | 'result'>>('select id,completed_at,result from public.preparation_diagnostics where user_id=$1 and scope=$2 and completed_at is not null order by completed_at desc limit 5', [context.userId, context.scope])
  return rows
}
