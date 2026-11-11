import Link from 'next/link'
import { ArrowRight, Check, Minus, X } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { MarketingHeader } from '@/components/marketing-header'
import { Button } from '@/components/ui/button'
import { getDb } from '@/lib/db'
import { getT } from '@/lib/i18n/server'
import { cn } from '@/lib/utils'

/**
 * The front page, written for a student or a parent seeing the site for the
 * first time: what it is, how it works, what is inside, and the questions
 * people actually ask. The figures are read from the database, not typed in.
 */

export async function generateMetadata() {
  const t = await getT()
  return { title: { absolute: t('OlympAI: preparation for mathematics and physics olympiads') } }
}

async function counts() {
  try {
    const db = await getDb()
    const { rows } = await db.query<{ tasks: number; olympiads: number }>(`
      select (select count(*) from public.tasks where class_id is null and not hidden)::int as tasks,
             (select count(*) from public.competitions
                where active and (coalesce(ends_on, starts_on) is null or coalesce(ends_on, starts_on) >= current_date))::int as olympiads`)
    return rows[0] ?? null
  } catch {
    return null
  }
}

function roughly(n: number) {
  const step = n >= 1000 ? 100 : 10
  return (Math.floor(n / step) * step).toLocaleString('ru-RU')
}

const steps = [
  {
    title: 'Choose your olympiad',
    body: 'Tell us which olympiad and when. The site picks the subject, the topics and the level of problems to match.',
  },
  {
    title: 'Write the whole solution',
    body: 'Type it, or take a photo of your notebook. Every line gets a mark, so you see exactly where the argument breaks.',
  },
  {
    title: 'Stuck? Ask for a hint',
    body: 'Sulu starts with a nudge, then an idea, and shows the full walkthrough only when you ask for it.',
  },
]

const inside = [
  'Past rounds of real olympiads, with the original statements and figures',
  'Timed mock papers, marked the way a jury marks',
  'Short notes, quizzes and flashcards for the main topics',
  'A preparation plan counted back from the date of your olympiad',
  'Classes for teachers: set problems and follow each student',
  'Russian, Kazakh and English, light and dark',
]

const faq = [
  {
    q: 'Is it free?',
    a: 'Yes. You only need an email address to create an account.',
  },
  {
    q: 'Who is it for?',
    a: 'School students from grade 7 who are preparing for olympiads in mathematics or physics, from the regional stage to international ones, and their teachers.',
  },
  {
    q: 'How is a solution checked?',
    a: 'The AI marks it out of 7 against a jury-style scheme and notes every line. It is a training aid, not an official result: if you disagree with a mark, you can report it from the same page.',
  },
  {
    q: 'Will Sulu just give me the answer?',
    a: 'Not straight away. First a nudge, then an idea, then one step. The full solution only when you ask for it yourself.',
  },
]

export default async function LandingPage() {
  const [t, stats] = await Promise.all([getT(), counts()])

  const figures = [
    stats ? { value: `${roughly(stats.tasks)}+`, label: t('problems from olympiad archives') } : null,
    stats ? { value: String(stats.olympiads), label: t('olympiads in the catalogue') } : null,
    { value: '2', label: t('subjects: mathematics and physics') },
    { value: '3', label: t('languages: Russian, Kazakh, English') },
  ].filter((item): item is { value: string; label: string } => item !== null)

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <MarketingHeader />

      {/* First screen ------------------------------------------------------ */}
      <section className="mx-auto grid max-w-[1120px] gap-12 px-5 pt-14 pb-16 sm:px-8 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="text-[15px] font-medium text-coral">{t('Mathematics and physics olympiads')}</p>
          <h1 className="font-display mt-4 text-[38px] leading-[1.1] font-semibold text-balance sm:text-[48px] xl:text-[54px]">
            {t('Prepare for olympiads with real problems and honest feedback')}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-7 text-muted-foreground">
            {t('Problems from past rounds, a check that marks every line of your solution, and hints that lead you to the answer instead of handing it over.')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  {t('Create a free account')} <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login">{t('I already have an account')}</Link>} />
          </div>
        </div>

        <ExampleCheck />
      </section>

      {/* Figures ------------------------------------------------------------- */}
      <section className="border-y border-border bg-card">
        <dl className="mx-auto grid max-w-[1120px] grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 sm:px-8 lg:grid-cols-4">
          {figures.map((figure) => (
            <div key={figure.label}>
              <dt className="sr-only">{figure.label}</dt>
              <dd className="font-display text-[34px] leading-none font-semibold tabular-nums">{figure.value}</dd>
              <dd className="mt-2 text-[15px] leading-5 text-muted-foreground">{figure.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works -------------------------------------------------------- */}
      <section id="how" className="mx-auto max-w-[1120px] scroll-mt-20 px-5 py-20 sm:px-8">
        <h2 className="font-display text-[32px] leading-tight font-semibold sm:text-[40px]">{t('How it works')}</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="flex size-9 items-center justify-center rounded-full border border-iron text-[15px] font-semibold tabular-nums">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{t(step.title)}</h3>
              <p className="mt-2 text-[16px] leading-7 text-muted-foreground">{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Subjects ------------------------------------------------------------ */}
      <section id="subjects" className="scroll-mt-20 border-t border-border">
        <div className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8">
          <h2 className="font-display text-[32px] leading-tight font-semibold sm:text-[40px]">{t('Two subjects, done properly')}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <SubjectCard
              title={t('Mathematics')}
              topics={t('Algebra, combinatorics, number theory, inequalities')}
              olympiads="IMO, APMO, EGMO, IZhO, «Шёлковый путь»"
            />
            <SubjectCard
              title={t('Physics')}
              topics={t('Mechanics, electricity, thermodynamics')}
              olympiads="IPhO, APhO, IZhO"
            />
          </div>
          <p className="mt-6 max-w-2xl text-[16px] leading-7 text-muted-foreground">
            {t('Plus the stages of the Kazakhstan republican olympiad, from the regional round to the final. Each olympiad has a page with who can take part, how selection works and links to the official sources.')}
          </p>
        </div>
      </section>

      {/* What is inside ------------------------------------------------------ */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-[32px] leading-tight font-semibold sm:text-[40px]">{t('What is inside')}</h2>
          <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {inside.map((item) => (
              <li key={item} className="flex gap-3 text-[16px] leading-6">
                <Check className="mt-0.5 size-5 shrink-0 text-success" />
                {t(item)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Questions ----------------------------------------------------------- */}
      <section id="faq" className="mx-auto max-w-[820px] scroll-mt-20 px-5 py-20 sm:px-8">
        <h2 className="font-display text-[32px] leading-tight font-semibold sm:text-[40px]">{t('Questions')}</h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {faq.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                {t(item.q)}
                <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-[16px] leading-7 text-muted-foreground">{t(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Last call ----------------------------------------------------------- */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display max-w-xl text-[28px] leading-tight font-semibold sm:text-[34px]">{t('Start with one problem today')}</h2>
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/signup">
                {t('Create a free account')} <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 py-8 text-[14px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span>© 2026</span>
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              {t('Log in')}
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              {t('Sign up')}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function SubjectCard({ title, topics, olympiads }: { title: string; topics: string; olympiads: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-[16px] leading-6 text-muted-foreground">{topics}</p>
      <p className="mt-4 text-[14px] text-foreground/80">{olympiads}</p>
    </div>
  )
}

/**
 * What a checked solution looks like, as an example: a short attempt with a
 * mark on each line and the score, the way the real check shows it.
 */
async function ExampleCheck() {
  const t = await getT()
  const lines: { text: string; mark: 'ok' | 'gap' | 'error'; note?: string }[] = [
    { text: 'mg sin α − F_тр = ma', mark: 'ok' },
    { text: 'N = mg cos α', mark: 'ok' },
    { text: 'F_тр = μN', mark: 'gap', note: t('Say that the block slides: only then is friction equal to μN') },
    { text: 'a = g (sin α + μ cos α)', mark: 'error', note: t('Sign error: friction points up the slope') },
  ]
  const markIcon = { ok: Check, gap: Minus, error: X }
  const markClass = { ok: 'text-success', gap: 'text-warning', error: 'text-destructive' }

  return (
    <figure className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-[14px] font-medium">{t('A block on an inclined plane')}</span>
        <span className="text-[13px] text-muted-foreground">{t('Example')}</span>
      </div>
      <ol className="divide-y divide-border">
        {lines.map((line, index) => {
          const Icon = markIcon[line.mark]
          return (
            <li key={line.text} className="flex gap-3 px-5 py-3">
              <span className="w-4 shrink-0 pt-0.5 text-right font-mono text-[12px] text-muted-foreground tabular-nums">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] tracking-[0.01em]">{line.text}</p>
                {line.note ? <p className={cn('mt-1 text-[13px]', markClass[line.mark])}>{line.note}</p> : null}
              </div>
              <Icon className={cn('size-4 shrink-0', markClass[line.mark])} />
            </li>
          )
        })}
      </ol>
      <figcaption className="flex items-baseline gap-3 border-t border-border px-5 py-4">
        <span className="shrink-0 text-[28px] leading-none font-semibold whitespace-nowrap tabular-nums">
          4<span className="text-[16px] text-muted-foreground"> / 7</span>
        </span>
        <span className="text-[14px] leading-5 text-muted-foreground">{t('The method is right; fix the sign in line 4 and justify line 3.')}</span>
      </figcaption>
    </figure>
  )
}
