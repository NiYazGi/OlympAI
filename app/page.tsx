import Link from 'next/link'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { MarketingHeader } from '@/components/marketing-header'
import { Meter } from '@/components/meter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getT } from '@/lib/i18n'
import { cardClass, cn, liftClass } from '@/lib/utils'

// Icon and colour here, words in the dictionary: the three cards are a fixed
// layout whose captions happen to be translatable, not a data set.
const subjectStyle = [
  { icon: CircleDot, color: 'bg-accent text-accent-foreground' },
  { icon: BrainCircuit, color: 'bg-success/15 text-success' },
  { icon: Target, color: 'bg-primary/15 text-primary' },
]

export default async function LandingPage() {
  const t = await getT()
  const subjects = t.landing.subjects.map((subject, index) => ({
    ...subject,
    ...subjectStyle[index]!,
  }))

  return (
    <main className="overflow-hidden">
      <MarketingHeader />

      <section className="relative border-b border-border/70 bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div className="relative z-10">
            <Badge variant="outline" className="gap-2 rounded-full bg-card px-3 py-1 text-primary">
              <span className="size-1.5 rounded-full bg-primary" /> {t.landing.badge}
            </Badge>
            <h1 className="font-display mt-6 max-w-2xl text-4xl leading-[1.08] font-bold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t.landing.headline}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
              {t.landing.lede}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link href="/signup">
                    {t.landing.startTraining} <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="#how">{t.landing.seeHow}</a>}
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> {t.landing.noCard}
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> {t.landing.focused}
              </span>
            </div>
          </div>

          {/* Illustrative product shot. The figures below are the shape of the
              interface, not a claim about any account. */}
          <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
            <div className="absolute -inset-8 rounded-[2rem] bg-primary/15 blur-3xl" />
            <figure className="relative rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-foreground/5 sm:p-6">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                  <p className="text-caption font-semibold text-muted-foreground">
                    {t.landing.todaysFocus}
                  </p>
                  <p className="mt-1 font-semibold">{t.landing.buildMomentum}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Sparkles className="size-5" />
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-primary/10 p-5 ring-1 ring-primary/25">
                <p className="text-caption font-semibold text-primary">
                  {t.landing.recommendedNext}
                </p>
                <h2 className="font-display mt-2 text-xl font-bold tracking-[-0.02em]">{t.landing.sampleTask}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.landing.sampleMeta}</p>
                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t.landing.sampleEstimate}</span>
                  <span>{t.landing.sampleDifficulty}</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.landing.sampleMastery}</p>
                <p className="font-display mt-1 text-2xl font-bold tabular-nums">82%</p>
                {/* The same measure the app draws, filling the same way. */}
                <Meter value={82} className="mt-3" />
              </div>

              <figcaption className="mt-4 text-center text-xs text-muted-foreground">
                {t.landing.exampleNote}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="subjects" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="text-caption font-semibold text-primary">
            {t.landing.oneHome}
          </p>
          <h2 className="font-display mt-3 text-2xl leading-[1.2] font-bold tracking-[-0.035em] sm:text-3xl">
            {t.landing.trainAcross}
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {subjects.map((subject) => (
            <div key={subject.name} className={cn(cardClass, liftClass, 'p-6')}>
              <div
                className={cn('flex size-11 items-center justify-center rounded-xl', subject.color)}
              >
                <subject.icon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">{subject.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{subject.detail}</p>
              <Link
                href="/signup"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Explore subject <ChevronRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section
        id="sulu"
        className="border-y border-border/70 bg-[oklch(0.135_0.016_235)] text-stone-100"
      >
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Sparkles className="size-6" />
            </div>
            <p className="mt-7 text-caption font-semibold text-primary">
              {t.landing.meetSulu}
            </p>
            <h2 className="font-display mt-3 text-2xl leading-[1.2] font-bold tracking-[-0.035em] sm:text-3xl">
              {t.landing.coachHeadline}
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-stone-200/60">
              {t.landing.coachBody}
            </p>
            <Button
              className="mt-8"
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  Try Sulu AI <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>

          <div className="rounded-2xl border border-stone-100/10 bg-stone-100/[0.06] p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-stone-100/10 pb-5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Sulu AI</p>
                <p className="text-xs text-stone-200/60">{t.landing.suluMentor}</p>
              </div>
              <span className="ml-auto size-2 rounded-full bg-success" />
            </div>
            <div className="space-y-4 py-6">
              <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-stone-100/10 p-4 text-sm leading-6 text-stone-200/85">
                {t.landing.chat1}
              </p>
              <p className="ml-auto max-w-[72%] rounded-2xl rounded-tr-sm bg-primary p-4 text-sm leading-6 text-primary-foreground">
                {t.landing.chat2}
              </p>
              <p className="max-w-[88%] rounded-2xl rounded-tl-sm bg-stone-100/10 p-4 text-sm leading-6 text-stone-200/85">
                {t.landing.chat3}
              </p>
            </div>
            <div className="rounded-xl border border-stone-100/10 px-4 py-3 text-sm text-stone-200/40">
              Ask Sulu about your approach…
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="text-caption font-semibold text-primary">
            {t.landing.progressEyebrow}
          </p>
          <h2 className="font-display mt-3 text-2xl leading-[1.2] font-bold tracking-[-0.035em] sm:text-3xl">
            {t.landing.progressHeadline}
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {t.landing.features.map((feature) => (
            <div key={feature.title} className={cn(cardClass, 'p-6')}>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Build your training plan <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-semibold text-foreground">OlympAI</span>
          <span>{t.landing.footerTag}</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Start training
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
