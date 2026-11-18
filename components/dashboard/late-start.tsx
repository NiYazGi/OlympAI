import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { getCurrentProfile, getPreparationSettings, getProgressAnalytics } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'

/**
 * An honest word for a student who starts olympiad preparation in grade 10-12:
 * most finalists began years earlier, so the standard plan is not enough to
 * catch up. Shown while the account is new (under 45 days, or fewer than 30
 * solved problems); it points to the one setting that changes the outcome.
 */
const NEW_FOR_DAYS = 45
const NEW_UNTIL_SOLVED = 30

/** Days since the account was created; outside the component so render stays pure. */
function accountAgeDays(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 86_400_000
}

function schoolGrade(fromSettings: number | null, profileGrade: string | null | undefined) {
  if (fromSettings) return fromSettings
  // The profile only stores bands; only the senior band is certainly 10+.
  return profileGrade === 'Grade 11–12' ? 11 : null
}

export async function LateStartWarning() {
  const [t, profile, settings, analytics] = await Promise.all([getT(), getCurrentProfile(), getPreparationSettings(), getProgressAnalytics()])
  if (!profile || profile.role === 'teacher') return null
  const grade = schoolGrade(settings.preferences.schoolGrade, profile.grade)
  if (!grade || grade < 10 || grade > 12) return null
  const ageDays = accountAgeDays(profile.created_at)
  if (ageDays > NEW_FOR_DAYS && analytics.correctAnswers >= NEW_UNTIL_SOLVED) return null

  return (
    <section role="note" className="mx-auto flex max-w-4xl gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:p-5">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="min-w-0 text-sm leading-relaxed">
        <p className="font-semibold">
          {grade >= 11
            ? t('You are starting in grade {n}: you are far behind those who began in grade 7–8.', { n: grade })
            : t('You are starting in grade 10: most finalists have been preparing since grade 7–8.')}
        </p>
        <p className="mt-1 text-muted-foreground">
          {grade >= 11
            ? t('There are one or two seasons left, so the standard plan will not close the gap. Plan on 2 hours a day, 6 days a week, problems at the level of the regional stage from the first weeks, and a mock paper every week. It is hard, but it is how late starters get into the final.')
            : t('The gap can be closed, but only with more work than the standard plan: 1.5–2 hours a day, 5–6 days a week, and problems at the level of the regional stage from the first month.')}
        </p>
        <Link href="/plan/settings" className="mt-2 inline-block font-medium text-primary hover:underline">{t('Increase the study time in the settings →')}</Link>
      </div>
    </section>
  )
}
