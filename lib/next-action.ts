import { identity, type Translate } from '@/lib/i18n/config'
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
  | 'recall'
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
 * Flashcards are not on this list: the deck sits beside a topic's ladder and
 * keeps its own schedule, and "review nine cards" crowded out "solve something"
 * as the day's instruction.
 *
 * 2. A lesson already opened and not finished. Something half-read is a worse
 *    state to leave than something unstarted.
 * 3. Otherwise the current topic's ladder, in order. The current topic is the
 *    first one that still has something in it.
 * 4. A paper, once everything else in the subject is done.
 */
export function nextAction(
  subjectName: string | null,
  topics: TopicPlan[],
  recommended: RecommendedTask | null = null,
  t: Translate = identity,
): NextAction {
  if (!subjectName) {
    return {
      kind: 'choose-subject',
      label: t('Choose what you are training for'),
      detail: t('A competition, or just a subject and a date.'),
      why: t('Everything here is ordered around one target. Without one there is no next step to name.'),
      topicName: null,
      subjectName: null,
      href: '/learn',
      cta: t('Set your target'),
    }
  }

  const withContent = topics.filter((topic) =>
    topic.stages.some((stage) => stage.state !== 'empty'),
  )

  if (withContent.length === 0) {
    return {
      kind: 'empty-subject',
      label: t('Nothing has been written for {subjectName} yet', { subjectName: t(subjectName) }),
      detail: t('No notes, no questions, no problems in this subject.'),
      why: t('Rather than filling the screen with material from a subject you are not training for.'),
      topicName: null,
      subjectName,
      href: '/learn?all=1',
      cta: t('Look at the other subjects'),
    }
  }

  // 2. Finish what was started.
  const halfRead = withContent.find(
    (topic) => stageOf(topic, 'study')?.state !== 'empty' && topic.input.lesson?.opened && !topic.input.lesson.completed,
  )
  if (halfRead) {
    return {
      kind: 'study',
      label: t('Finish the notes on {name}', { name: halfRead.name }),
      detail: stageOf(halfRead, 'study').detail,
      why: t('You stopped partway through this note. Pick up from where you left off?'),
      topicName: halfRead.name,
      subjectName,
      href: `/learn/${halfRead.slug}/lesson`,
      cta: t('Pick it up'),
    }
  }

  // 3. The current topic, taken in order.
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
        label: t('Read the notes on {name}', { name: current.name }),
        detail: stage.detail,
        why: t('First step in a topic you have not started. Everything after it assumes this.'),
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/lesson`,
        cta: t('Start reading'),
      }
    }

    if (stage.key === 'check') {
      const left = current.input.quiz.total - current.input.quiz.correct
      return {
        kind: 'check',
        label: t('Check yourself on {name}', { name: current.name }),
        detail: t('{left} questions still to get right · a few minutes', { left }),
        why: t('You have read it. Answering from memory is what turns reading into something you can use.'),
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/quiz`,
        cta: t('Start the quiz'),
      }
    }

    if (stage.key === 'recall') {
      return {
        kind: 'recall',
        label: t('Learn the cards for {name}', { name: current.name }),
        detail: stage.detail,
        why: t('Nothing is due yet, so this is the first pass — the facts you will need without looking them up.'),
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/cards`,
        cta: t('Open the deck'),
      }
    }

    const left = current.input.tasks.total - current.input.tasks.solved

    // Name the problem rather than the shelf it is on. The recommender already
    // weighs mastery and difficulty; sending someone to a filtered list to make
    // the same choice again is a step that decides nothing.
    if (recommended && recommended.topic === current.name) {
      return {
        kind: 'apply',
        label: t('Solve: {title}', { title: recommended.title }),
        detail: recommended.estimatedMinutes
          ? t('{topic} · {difficulty}★ · about {minutes} min', {
              topic: current.name,
              difficulty: recommended.difficulty,
              minutes: recommended.estimatedMinutes,
            })
          : `${current.name} · ${recommended.difficulty}★`,
        why: t('The basic route steps are done. Now test the method by solving a problem.'),
        topicName: current.name,
        subjectName,
        href: `/tasks/${recommended.id}`,
        cta: t('Open the problem'),
      }
    }

    return {
      kind: 'apply',
      label: t('Solve a problem in {name}', { name: current.name }),
      detail: t('{left} left in this topic · full derivation, graded on the method', { left }),
      why: t('The basic route steps are done. Now test the method by solving a problem.'),
      topicName: current.name,
      subjectName,
      href: `/tasks?topic=${encodeURIComponent(current.name)}`,
      cta: t('Pick a problem'),
    }
  }

  // 4. Everything in the subject is done.
  const paper = withContent.find((topic) => topic.input.mocks.subjectEligible && topic.input.mocks.taken === 0)
  if (paper) {
    return {
      kind: 'sit',
      label: t('Sit a {subjectName} paper', { subjectName: t(subjectName) }),
      detail: t('Timed, no hints, no coach.'),
      why: t('The available route steps are done. A separate mock test shows the result on specific problems.'),
      topicName: null,
      subjectName,
      href: '/mock',
      cta: t('Start a paper'),
    }
  }

  return {
    kind: 'done',
    label: t('Every available route step is done'),
    detail: topics.some((topic) => topic.stages.some((stage) => stage.state === 'empty')) ? t('Some materials are not ready yet. This does not confirm that every topic is mastered.') : t('Notes read, questions and problems counted. Skill mastery is measured separately.'),
    why: t('Nothing here is unfinished. More material is what this needs now, not more effort from you.'),
    topicName: null,
    subjectName,
    href: '/learn?all=1',
    cta: t('Look at another subject'),
  }
}
