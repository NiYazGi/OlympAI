import { Route } from 'lucide-react'
import { PreparationGoalForm } from '@/components/preparation/goal-form'
import { getCompetitionOptions, getGoal, getPreparationSettings, getSubjectSummary } from '@/lib/supabase/queries'
import { getT } from '@/lib/i18n/server'

/** The dashboard entry point for accounts without a complete preparation goal. */
export async function PreparationStart() {
  const [goal, competitions, subjects, settings, t] = await Promise.all([
    getGoal(), getCompetitionOptions(), getSubjectSummary(), getPreparationSettings(), getT(),
  ])
  return <section id="preparation-setup" aria-labelledby="preparation-setup-title" className="scroll-mt-6 py-2 sm:py-3">
    <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Route aria-hidden className="size-5" /></div>
    <h2 id="preparation-setup-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Your preparation route starts here')}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('Choose an olympiad and a target date to build your personal route. Your profile and preparation settings determine the level and pace.')}</p>
    <p className="mt-2 text-xs text-muted-foreground">{t('Theory, {n} problems and a quiz on each study day, with mock tests along the way.', { n: settings.preferences.dailyTasks ?? 5 })}</p>
    <PreparationGoalForm goal={goal} competitions={competitions} subjects={subjects} today={new Date().toISOString().slice(0, 10)} />
  </section>
}
