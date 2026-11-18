import { MarketingHeader } from '@/components/marketing-header'
import { MathText } from '@/components/math-text'
import { DemoRunner } from '@/components/demo/demo-runner'
import { DEMO_TASKS } from '@/lib/demo-tasks'
import { getT } from '@/lib/i18n/server'

export async function generateMetadata() {
  const t = await getT()
  return { title: t('Try OlympAI'), description: t('Solve a demo problem, open the hints one by one and get the line-by-line check — without an account.') }
}

/** The public demo: what the check and the hints are like, before signing up. */
export default async function TryPage() {
  const t = await getT()
  return (
    <main className="min-h-dvh bg-background">
      <MarketingHeader />
      <div className="mx-auto max-w-[860px] px-5 py-12 sm:px-8">
        <h1 className="font-display text-[34px] leading-tight font-semibold">{t('Try it without signing up')}</h1>
        <p className="mt-3 max-w-2xl text-[16px] leading-7 text-muted-foreground">
          {t('Pick a problem, open the hints one at a time if you get stuck, and send your solution: the same check students get marks every line and scores it out of 7.')}
        </p>
        <div className="mt-8">
          <DemoRunner
            items={DEMO_TASKS.map((task) => ({
              id: task.id,
              subject: task.subject,
              title: task.title,
              statement: <MathText text={task.problem} />,
              hints: task.hints.map((hint, index) => <MathText key={index} text={hint} className="inline [&>p]:inline" />),
            }))}
          />
        </div>
      </div>
    </main>
  )
}
