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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cardClass, cn } from '@/lib/utils'

const subjects = [
  {
    icon: CircleDot,
    name: 'Physics',
    detail: 'Mechanics, fields, thermodynamics',
    color: 'bg-accent text-blue-600',
  },
  {
    icon: BrainCircuit,
    name: 'Mathematics',
    detail: 'Algebra, combinatorics, number theory',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Target,
    name: 'Computer Science',
    detail: 'Algorithms, data structures, logic',
    color: 'bg-amber-50 text-amber-600',
  },
]

const features = [
  {
    title: 'Graded on the reasoning',
    body: 'Submit a full derivation. Sulu reads the argument, awards partial credit for a sound method, and tells you the first step that breaks.',
  },
  {
    title: 'Hints before answers',
    body: 'The coach opens with a question, not a solution. It only walks the whole problem once you have genuinely attempted it.',
  },
  {
    title: 'Mastery per topic',
    body: 'Accuracy is tracked topic by topic from your own attempts, so the weekly plan always leads with what is actually weak.',
  },
]

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-background">
      <MarketingHeader />

      <section className="relative border-b border-border/70 bg-muted/30">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div className="relative z-10">
            <Badge
              variant="outline"
              className="gap-2 rounded-full bg-card px-3 py-1 text-primary"
            >
              <span className="size-1.5 rounded-full bg-primary" /> Built for olympiad thinkers
            </Badge>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-foreground sm:text-7xl">
              Your hardest problems deserve a better training plan.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
              OlympAI turns ambitious practice into clear progress. Solve deeply, learn from every
              attempt, and train with Sulu AI when you get stuck.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link href="/signup">
                    Start training <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="#how">See how it works</a>}
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Built for focused practice
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
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Today&apos;s focus
                  </p>
                  <p className="mt-1 font-semibold">Build momentum</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Sparkles className="size-5" />
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-primary p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
                  Recommended next
                </p>
                <h2 className="mt-2 text-xl font-semibold">Two masses and a pulley</h2>
                <p className="mt-1 text-sm text-white/70">Physics · Mechanics · Hard</p>
                <div className="mt-6 flex items-center justify-between text-xs text-white/70">
                  <span>20 min estimate</span>
                  <span>5 of 5 difficulty</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-background p-4">
                <p className="text-xs text-muted-foreground">Mechanics mastery</p>
                <p className="mt-1 text-2xl font-semibold">82%</p>
                <div className="mt-3 h-1.5 rounded-full bg-muted">
                  <div className="h-full w-[82%] rounded-full bg-primary" />
                </div>
              </div>

              <figcaption className="mt-4 text-center text-xs text-muted-foreground">
                Example view — your dashboard starts empty.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="subjects" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-primary">One home for serious practice</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Train across the subjects that shape olympiad careers.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {subjects.map((subject) => (
            <div
              key={subject.name}
              className={cn(cardClass, 'p-6 transition-transform hover:-translate-y-1')}
            >
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

      <section id="sulu" className="border-y border-border/70 bg-[oklch(0.14_0.015_265)] text-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
              <Sparkles className="size-6" />
            </div>
            <p className="mt-7 text-sm font-semibold text-blue-300">Meet Sulu AI</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A coach that makes you think better.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/60">
              Sulu guides your reasoning with the right hint at the right time. It sees the problem
              context, follows the thread of your conversation, and helps you build the next step
              yourself.
            </p>
            <Button
              className="mt-8 bg-white text-slate-950 hover:bg-white/90"
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  Try Sulu AI <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-7">
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500 text-white">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Sulu AI</p>
                <p className="text-xs text-white/60">Your olympiad mentor</p>
              </div>
              <span className="ml-auto size-2 rounded-full bg-emerald-400" />
            </div>
            <div className="space-y-4 py-6">
              <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 p-4 text-sm leading-6 text-white/85">
                Before we write equations, what stays the same throughout the string?
              </p>
              <p className="ml-auto max-w-[72%] rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm leading-6 text-white">
                The acceleration magnitude of both masses.
              </p>
              <p className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 p-4 text-sm leading-6 text-white/85">
                Exactly. Now use that constraint to connect the two free-body diagrams.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/40">
              Ask Sulu about your approach…
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-primary">Progress you can act on</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            See what to practise next, not just what you finished.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
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
          <span>Practice with purpose. Compete with confidence.</span>
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
