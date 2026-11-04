import Link from 'next/link'
import {
  ArrowRight,
  Atom,
  BookOpenText,
  BrainCircuit,
  Calculator,
  ClipboardCheck,
  Layers,
  PenLine,
  Search,
  Sparkles,
} from 'lucide-react'
import { BrandGlyph, BrandMark, SuluGlyph } from '@/components/brand-mark'
import { MarketingHeader } from '@/components/marketing-header'
import { Button } from '@/components/ui/button'
import { cn, delay } from '@/lib/utils'
import { getT } from '@/lib/i18n/server'

const subjects = [
  { icon: Atom, name: 'Physics', detail: 'Mechanics, fields, thermodynamics' },
  { icon: Calculator, name: 'Mathematics', detail: 'Algebra, combinatorics, number theory' },
]

const ladder = [
  { icon: BookOpenText, step: '01', title: 'Study', body: 'Short notes with figures that draw themselves in the order you would sketch them.' },
  { icon: ClipboardCheck, step: '02', title: 'Check', body: 'A quiz marked the instant you answer, so a misconception never survives the page.' },
  { icon: Layers, step: '03', title: 'Keep', body: 'Spaced-repetition cards that come back exactly when you are about to forget them.' },
  { icon: PenLine, step: '04', title: 'Apply', body: 'A real olympiad problem. Write the full derivation; Sulu grades the reasoning.' },
  { icon: BrainCircuit, step: '05', title: 'Sit', body: 'A timed mock paper that measures where you are against the competition.' },
]

const features = [
  {
    title: 'Graded on the reasoning',
    body: 'Submit a full derivation. Sulu reads the argument, gives partial credit for a sound method, and points at the first step that breaks.',
  },
  {
    title: 'Hints before answers',
    body: 'The coach opens with a question, not a solution, and only walks the whole problem once you have genuinely tried.',
  },
  {
    title: 'One instruction a day',
    body: 'The dashboard answers a single question — what should I do today — and prints the reason underneath.',
  },
  {
    title: 'XP for evidence',
    body: 'Levels move only for work marked on the server. Re-solving a problem pays a tenth, so the number tracks understanding.',
  },
  {
    title: 'Built around your olympiad',
    body: 'Pick the competition. Material narrows to its subject and the route through the topics is ordered for it.',
  },
  {
    title: 'Figures, not screenshots',
    body: 'Diagrams are stored as parameters and drawn on the page, crisp at any size and consistent every time.',
  },
]

export default async function LandingPage() {
  const t = await getT()

  return (
    <main className="relative overflow-hidden bg-void">
      <MarketingHeader />

      {/* Hero ------------------------------------------------------------- */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pt-32 pb-24 text-center">
        <div className="hero-atmosphere" aria-hidden>
          <div className="hero-grid" />
          <span className="hero-bar hero-bar--blue" />
          <span className="hero-bar hero-bar--coral" />
          <span className="hero-bar hero-bar--coral-2" />
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center">
          <a
            href="#sulu"
            className="enter group inline-flex items-center gap-2 rounded-full bg-foreground/[0.04] py-1 pr-3 pl-1 text-[13px] text-ash shadow-key backdrop-blur-xl transition-colors hover:text-foreground"
          >
            <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{t('AI')}</span>
            {t('Meet Sulu, the coach that asks before it tells')}
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>

          <h1
            className="enter text-fade mt-8 text-[44px] leading-[1.08] font-normal tracking-[0.004em] sm:text-[64px]"
            style={delay(120)}
          >
            {t('Think harder.')}
            <br />
            {t('Train smarter.')}
          </h1>

          <p className="enter mt-6 max-w-[520px] text-base leading-relaxed text-ash sm:text-lg" style={delay(240)}>
            {t('A training cockpit for academic olympiads. Study, check, keep, apply and sit — one topic at a time, graded on the reasoning, not the final number.')}
          </p>

          <div className="enter mt-10 flex flex-col gap-2 sm:flex-row" style={delay(360)}>
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  {t('Start training free')} <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login">{t('Log in')}</Link>} />
          </div>

          <p className="enter mt-6 font-mono text-xs text-smoke" style={delay(460)}>
            {t('2 subjects')} <span className="mx-2 text-iron">|</span> {t('5-step study ladder')}{' '}
            <span className="mx-2 text-iron">|</span> {t('No card required')}
          </p>
        </div>

        {/* Command-bar mockup */}
        <div className="enter relative z-10 mt-20 w-full max-w-[760px]" style={delay(600)}>
          <CommandWindow />
        </div>
      </section>

      {/* Subjects marquee -------------------------------------------------- */}
      <section id="subjects" className="relative border-y border-foreground/[0.06] py-10">
        <p className="eyebrow mb-8 text-center" data-reveal>
          {t('Two subjects, one discipline')}
        </p>
        <div className="marquee-mask overflow-hidden">
          <div className="marquee gap-3">
            {[...subjects, ...subjects].map((subject, index) => (
              <div
                key={`${subject.name}-${index}`}
                className="flex shrink-0 items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-key"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-graphite text-mist">
                  <subject.icon className="size-4" />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-medium text-foreground">{t(subject.name)}</span>
                  <span className="block text-xs text-smoke">{t(subject.detail)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ladder ------------------------------------------------------------ */}
      <section id="ladder" className="mx-auto max-w-[1200px] px-4 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow={t('The study ladder')}
          title={t('Five steps from notes to a graded derivation.')}
          body={t('Every topic runs the same route. The order is a recommendation and nothing is locked — if you already know a topic, go straight to the problems.')}
        />
        <div className="mt-16 grid gap-3 md:grid-cols-5">
          {ladder.map((item, index) => (
            <div
              key={item.step}
              data-reveal
              style={delay(index * 80)}
              className="spotlight lift flex flex-col rounded-2xl bg-card p-6 shadow-key"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full bg-graphite text-mist">
                  <item.icon className="size-4" />
                </span>
                <span className="font-mono text-xs text-smoke">{item.step}</span>
              </div>
              <h3 className="mt-8 text-lg font-medium text-foreground">{t(item.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ash">{t(item.body)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sulu ---------------------------------------------------------------- */}
      <section id="sulu" className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[480px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,99,99,0.14),transparent)]"
        />
        <div className="relative mx-auto grid max-w-[1200px] gap-16 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div data-reveal>
            <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-ember shadow-key">
              <span aria-hidden className="breathe absolute inset-0 rounded-full bg-coral/25 blur-xl" />
              <SuluGlyph className="relative size-7" />
            </span>
            <p className="eyebrow mt-8">{t('Sulu AI')}</p>
            <h2 className="mt-4 text-[32px] leading-[1.15] font-normal text-foreground sm:text-[44px]">
              {t('A coach that makes you')} <span className="text-shimmer">{t('think')}</span>{t(', not copy.')}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-ash">
              {t('Sulu sees the problem you are on, follows the thread of the conversation and hands you the next question rather than the next line. When you are genuinely stuck, it walks you through — and never quotes the answer key.')}
            </p>
            <Button
              className="mt-10"
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  {t('Try Sulu AI')} <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>

          <div data-reveal style={delay(150)}>
            <div className="beam-frame rounded-[20px]">
              <div className="surface-ember overflow-hidden rounded-[20px]">
                <div className="flex items-center gap-3 border-b border-foreground/[0.06] px-5 py-4">
                  <span className="flex size-8 items-center justify-center rounded-full bg-void shadow-key">
                    <SuluGlyph className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('Sulu')}</p>
                    <p className="font-mono text-[11px] text-ash">{t('Two masses and a pulley')}</p>
                  </div>
                  <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-ash">
                    <span className="size-1.5 rounded-full bg-success" /> {t('online')}
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <Bubble from="sulu" index={0}>
                    {t('Before any equations — what stays the same for both masses throughout?')}
                  </Bubble>
                  <Bubble from="me" index={1}>
                    {t('The magnitude of the acceleration, because the string does not stretch.')}
                  </Bubble>
                  <Bubble from="sulu" index={2}>
                    {t('Exactly. Write Newton\'s second law for each mass with that shared')} <em>a</em>{t(', then look at what the tension does.')}
                  </Bubble>
                </div>
                <div className="m-5 mt-0 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2.5 text-sm text-smoke">
                  {t('Ask Sulu about your approach')}
                  <span className="caret" />
                  <span className="kbd ml-auto">↵</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grading ------------------------------------------------------------ */}
      <section id="grading" className="mx-auto max-w-[1200px] px-4 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow={t('Built different')}
          title={t('Everything downstream is derived from real work.')}
          body={t('Mastery, XP, the route and readiness are all computed from graded attempts — never from a counter that could drift.')}
        />
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              data-reveal
              style={delay((index % 3) * 90)}
              className="spotlight rounded-2xl bg-card p-6 shadow-key"
            >
              <h3 className="text-base font-medium text-foreground">{t(feature.title)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ash">{t(feature.body)}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-3 overflow-hidden rounded-[20px] bg-card shadow-window">
          <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
            <div className="border-b border-foreground/[0.06] p-6 md:border-r md:border-b-0 sm:p-8">
              <p className="eyebrow">{t('Your attempt')}</p>
              <div className="mt-5 space-y-2 font-mono text-[13px] leading-relaxed text-ash">
                <p>m₁g − T = m₁a</p>
                <p>T − m₂g = m₂a</p>
                <p className="text-foreground">⇒ a = g(m₁ − m₂)/(m₁ + m₂)</p>
                <p>T = m₁(g − a) = 2m₁m₂g/(m₁ + m₂)</p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{t('Sulu\'s verdict')}</p>
                <span className="rounded-md bg-success/10 px-1.5 py-0.5 font-mono text-[11px] text-success">
                  {t('correct')}
                </span>
              </div>
              <p className="mt-5 text-[40px] leading-none font-medium text-foreground tabular-nums">
                94<span className="text-lg text-smoke">/100</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ash">
                {t('Sound method and a clean elimination of T. State why the string\'s mass can be ignored to make the argument complete.')}
              </p>
              <p className="mt-4 font-mono text-[11px] text-smoke">{t('Example — your dashboard starts empty.')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-t border-foreground/[0.06]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto h-80 max-w-3xl rounded-full bg-[radial-gradient(closest-side,rgba(99,161,255,0.22),transparent)] blur-2xl"
        />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-4 py-28 text-center sm:py-36">
          <div data-reveal className="relative">
            <span aria-hidden className="breathe absolute inset-0 rounded-full bg-coral/30 blur-2xl" />
            <span className="relative flex size-20 items-center justify-center rounded-[22px] bg-card shadow-key-strong">
              <BrandGlyph className="size-9" />
            </span>
          </div>
          <h2 data-reveal style={delay(100)} className="text-fade mt-10 text-[36px] leading-[1.1] font-normal sm:text-[56px]">
            {t('Train with intent.')}
            <br />
            {t('Compete with confidence.')}
          </h2>
          <div data-reveal style={delay(200)} className="mt-10 flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  {t('Start training free')} <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login">{t('I have an account')}</Link>} />
          </div>
        </div>
      </section>

      <footer className="border-t border-foreground/[0.06]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <BrandMark />
          <p className="font-mono text-xs text-smoke">
            v0.1.0 <span className="mx-2 text-iron">|</span> {t('Physics · Mathematics')}
          </p>
          <div className="flex gap-6 text-[13px] text-ash">
            <Link href="/login" className="transition-colors hover:text-foreground">
              {t('Log in')}
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              {t('Sign up')}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p data-reveal className="eyebrow">
        {eyebrow}
      </p>
      <h2 data-reveal style={delay(80)} className="mt-5 text-[32px] leading-[1.15] font-normal text-foreground sm:text-[44px]">
        {title}
      </h2>
      <p data-reveal style={delay(160)} className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ash">
        {body}
      </p>
    </div>
  )
}

function Bubble({ from, index, children }: { from: 'sulu' | 'me'; index: number; children: React.ReactNode }) {
  return (
    <p
      data-reveal
      style={delay(300 + index * 350)}
      className={cn(
        'max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed',
        from === 'sulu'
          ? 'rounded-tl-md bg-foreground/[0.06] text-foreground/90'
          : 'ml-auto rounded-tr-md bg-primary text-primary-foreground',
      )}
    >
      {children}
    </p>
  )
}

const commandRows = [
  { icon: PenLine, title: 'Two masses and a pulley', meta: 'Physics · Mechanics', tag: 'Problem', active: true },
  { icon: Layers, title: 'Review 6 due cards', meta: 'Kinematics', tag: 'Cards' },
  { icon: ClipboardCheck, title: 'Quiz: conservation of momentum', meta: '8 questions', tag: 'Quiz' },
  { icon: BrainCircuit, title: 'Mock paper — national round', meta: '90 min', tag: 'Paper' },
]

/** The product as an object: a command window with one row lit. */
async function CommandWindow() {
  const t = await getT()

  return (
    <div className="overflow-hidden rounded-2xl bg-ink/90 text-left shadow-window backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-foreground/[0.06] px-4 py-3.5">
        <Search className="size-4 text-smoke" />
        <span className="text-[15px] text-foreground">
          {t('What should I do today')}<span className="caret" />
        </span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </div>
      <div className="p-2">
        <p className="px-2 pt-1 pb-2 font-mono text-[11px] text-smoke">{t('Suggested · from your route')}</p>
        {commandRows.map((row) => (
          <div
            key={row.title}
            className={cn(
              'flex items-center gap-3 rounded-lg px-2 py-2',
              row.active && 'bg-foreground/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            )}
          >
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-md',
                row.active ? 'bg-coral text-primary-foreground' : 'bg-graphite text-ash',
              )}
            >
              <row.icon className="size-3.5" />
            </span>
            <span className="truncate text-sm text-foreground">{t(row.title)}</span>
            <span className="hidden truncate text-sm text-smoke sm:inline">{t(row.meta)}</span>
            <span className="ml-auto font-mono text-[11px] text-smoke">{t(row.tag)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-foreground/[0.06] px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs text-ash">
          <BrandGlyph className="size-3.5" /> {t('OlympAI')}
        </span>
        <span className="flex items-center gap-2 text-xs text-ash">
          {t('Open')} <span className="kbd">↵</span>
        </span>
      </div>
    </div>
  )
}
