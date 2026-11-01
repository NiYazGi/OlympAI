import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { LadderInput, LadderStage } from '@/lib/ladder'

/**
 * The one thing to do right now.
 *
 * /learn and /tasks were two catalogues side by side: one listed every topic in
 * every subject, the other every problem, both behind filters, and neither
 * answered the question a student actually arrives with. This picks a single
 * action and both pages lead with it, so they read as two views of one plan
 * rather than two places to browse.
 *
 * Pure: the counting happens in lib/supabase/study.ts and the choosing happens
 * here, so the priority order below can be argued with without a database.
 */

export type NextActionKind =
  | 'study'
  | 'check'
  | 'apply'
  | 'sit'
  | 'choose-subject'
  | 'empty-subject'
  | 'done'

export type NextAction = {
  kind: NextActionKind
  /** The instruction itself: "Review 6 cards", "Read the notes on Mechanics". */
  label: string
  /** What it involves — length, count, difficulty. */
  detail: string
  /** Why this and not something else. One line, and it has to be true. */
  why: string
  topicName: string | null
  subjectName: string | null
  href: string
  cta: string
}

/** The problem the recommender picked, when there is one worth naming. */
export type RecommendedTask = {
  id: string
  title: string
  topic: string
  difficulty: number
  estimatedMinutes: number | null
}

export type TopicPlan = {
  slug: string
  name: string
  input: LadderInput
  stages: LadderStage[]
  percent: number
}

const stageOf = (topic: TopicPlan, key: LadderStage['key']) =>
  topic.stages.find((stage) => stage.key === key)!

/**
 * Order of business, and the reasoning for it:
 *
 * 1. A lesson already opened and not finished. Something half-read is a worse
 *    state to leave than something unstarted.
 * 2. Otherwise the current topic's ladder, in order. The current topic is the
 *    first one that still has something in it.
 * 3. A paper, once everything else in the subject is done.
 *
 * Due flashcards used to come first, on the argument that spacing has a
 * deadline. It is a good argument about cards and a bad one about a session:
 * it meant the app opened with "review nine cards" most mornings, and a
 * student who did as they were told spent their time on definitions instead of
 * problems. The deck is still there, still scheduled, and it is now something
 * offered rather than the instruction.
 */
export function nextAction(
  subjectName: string | null,
  topics: TopicPlan[],
  recommended: RecommendedTask | null = null,
  t: Dictionary,
): NextAction {
  const copy = t.nextAction
  /*
   * Section names are translated, the same way they are everywhere else the
   * student sees one. The card was reading "Прочитать конспект: Algebra" — the
   * sentence in Russian and the section in English, because the name reaching
   * here is the one the database stores.
   */
  const named = (name: string) => t.topics[name] ?? name
  const subject = t.subjects[subjectName ?? ''] ?? subjectName

  if (!subjectName) {
    return {
      kind: 'choose-subject',
      ...copy.chooseSubject,
      topicName: null,
      subjectName: null,
      href: '/learn',
    }
  }

  const withContent = topics.filter((topic) =>
    topic.stages.some((stage) => stage.state !== 'empty'),
  )

  if (withContent.length === 0) {
    return {
      kind: 'empty-subject',
      label: copy.emptySubject.label(subject ?? ""),
      detail: copy.emptySubject.detail,
      why: copy.emptySubject.why,
      topicName: null,
      subjectName,
      href: '/learn?all=1',
      cta: copy.emptySubject.cta,
    }
  }

  // 1. Finish what was started.
  const halfRead = withContent.find(
    (topic) => topic.input.lesson?.opened && !topic.input.lesson.completed,
  )
  if (halfRead) {
    return {
      kind: 'study',
      label: copy.halfRead.label(named(halfRead.name)),
      detail: stageOf(halfRead, 'study').detail,
      why: copy.halfRead.why,
      topicName: halfRead.name,
      subjectName,
      href: `/learn/${halfRead.slug}/lesson`,
      cta: copy.halfRead.cta,
    }
  }

  // 2. The current topic, taken in order.
  const current = withContent.find((topic) =>
    topic.stages.some(
      (stage) => stage.key !== 'sit' && stage.state !== 'empty' && stage.state !== 'done',
    ),
  )

  if (current) {
    const stage = current.stages.find(
      (item) => item.key !== 'sit' && item.state !== 'empty' && item.state !== 'done',
    )!

    if (stage.key === 'study') {
      return {
        kind: 'study',
        label: copy.study.label(named(current.name)),
        detail: stage.detail,
        why: copy.study.why,
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/lesson`,
        cta: copy.study.cta,
      }
    }

    if (stage.key === 'check') {
      const left = current.input.quiz.total - current.input.quiz.correct
      return {
        kind: 'check',
        label: copy.check.label(named(current.name)),
        detail: copy.check.detail(left),
        why: copy.check.why,
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/quiz`,
        cta: copy.check.cta,
      }
    }

    const left = current.input.tasks.total - current.input.tasks.solved

    // Name the problem rather than the shelf it is on. The recommender already
    // weighs mastery and difficulty; sending someone to a filtered list to make
    // the same choice again is a step that decides nothing.
    if (recommended && recommended.topic === current.name) {
      return {
        kind: 'apply',
        label: copy.applyNamed.label(recommended.title),
        detail: copy.applyNamed.detail(
          named(current.name),
          recommended.difficulty,
          recommended.estimatedMinutes,
        ),
        why: copy.apply.why,
        topicName: current.name,
        subjectName,
        href: `/tasks/${recommended.id}`,
        cta: copy.applyNamed.cta,
      }
    }

    return {
      kind: 'apply',
      label: copy.apply.label(named(current.name)),
      detail: copy.apply.detail(left),
      why: copy.apply.why,
      topicName: current.name,
      subjectName,
      href: `/tasks?topic=${encodeURIComponent(current.name)}`,
      cta: copy.apply.cta,
    }
  }

  // 3. Everything in the subject is done.
  const paper = withContent.find((topic) => stageOf(topic, 'sit').state === 'ready')
  if (paper) {
    return {
      kind: 'sit',
      label: copy.sit.label(subject ?? ""),
      detail: copy.sit.detail,
      why: copy.sit.why,
      topicName: null,
      subjectName,
      href: '/mock',
      cta: copy.sit.cta,
    }
  }

  return {
    kind: 'done',
    label: copy.done.label(subject ?? ""),
    detail: copy.done.detail,
    why: copy.done.why,
    topicName: null,
    subjectName,
    href: '/learn?all=1',
    cta: copy.done.cta,
  }
}
