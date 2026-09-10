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
 * 1. Cards that are due, anywhere in the subject. Spacing is the one thing here
 *    with a deadline — a card met a week late has already been forgotten, and
 *    the whole schedule is worthless if the queue is not cleared. It is also
 *    the shortest job on the list.
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
): NextAction {
  if (!subjectName) {
    return {
      kind: 'choose-subject',
      label: 'Choose what you are training for',
      detail: 'A competition, or just a subject and a date.',
      why: 'Everything here is ordered around one target. Without one there is no next step to name.',
      topicName: null,
      subjectName: null,
      href: '/learn',
      cta: 'Set your target',
    }
  }

  const withContent = topics.filter((topic) =>
    topic.stages.some((stage) => stage.state !== 'empty'),
  )

  if (withContent.length === 0) {
    return {
      kind: 'empty-subject',
      label: `Nothing has been written for ${subjectName} yet`,
      detail: 'No notes, no questions, no problems in this subject.',
      why: 'Rather than filling the screen with material from a subject you are not training for.',
      topicName: null,
      subjectName,
      href: '/learn?all=1',
      cta: 'Look at the other subjects',
    }
  }

  // 1. Anything due today, oldest topic first.
  const due = withContent.find((topic) => topic.input.cards.due > 0)
  if (due) {
    const count = due.input.cards.due
    return {
      kind: 'recall',
      label: `Review ${count} card${count === 1 ? '' : 's'} in ${due.name}`,
      detail: `${count} due now · about ${Math.max(1, Math.round(count * 0.4))} min`,
      why: 'Cards are due today. Spacing only works if the date is met — later is a different, weaker exercise.',
      topicName: due.name,
      subjectName,
      href: `/learn/${due.slug}/cards`,
      cta: 'Start reviewing',
    }
  }

  // 2. Finish what was started.
  const halfRead = withContent.find(
    (topic) => topic.input.lesson?.opened && !topic.input.lesson.completed,
  )
  if (halfRead) {
    return {
      kind: 'study',
      label: `Finish the notes on ${halfRead.name}`,
      detail: stageOf(halfRead, 'study').detail,
      why: 'You opened this and did not finish it. Half-read is the worst place to leave a topic.',
      topicName: halfRead.name,
      subjectName,
      href: `/learn/${halfRead.slug}/lesson`,
      cta: 'Pick it up',
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
        label: `Read the notes on ${current.name}`,
        detail: stage.detail,
        why: 'First step in a topic you have not started. Everything after it assumes this.',
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/lesson`,
        cta: 'Start reading',
      }
    }

    if (stage.key === 'check') {
      const left = current.input.quiz.total - current.input.quiz.correct
      return {
        kind: 'check',
        label: `Check yourself on ${current.name}`,
        detail: `${left} question${left === 1 ? '' : 's'} still to get right · a few minutes`,
        why: 'You have read it. Answering from memory is what turns reading into something you can use.',
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/quiz`,
        cta: 'Start the quiz',
      }
    }

    if (stage.key === 'recall') {
      return {
        kind: 'recall',
        label: `Learn the cards for ${current.name}`,
        detail: stage.detail,
        why: 'Nothing is due yet, so this is the first pass — the facts you will need without looking them up.',
        topicName: current.name,
        subjectName,
        href: `/learn/${current.slug}/cards`,
        cta: 'Open the deck',
      }
    }

    const left = current.input.tasks.total - current.input.tasks.solved

    // Name the problem rather than the shelf it is on. The recommender already
    // weighs mastery and difficulty; sending someone to a filtered list to make
    // the same choice again is a step that decides nothing.
    if (recommended && recommended.topic === current.name) {
      return {
        kind: 'apply',
        label: `Solve: ${recommended.title}`,
        detail: `${current.name} · ${recommended.difficulty}★${
          recommended.estimatedMinutes ? ` · about ${recommended.estimatedMinutes} min` : ''
        }`,
        why: 'The topic is learned. This is the step that finds out whether it holds up under a real problem.',
        topicName: current.name,
        subjectName,
        href: `/tasks/${recommended.id}`,
        cta: 'Open the problem',
      }
    }

    return {
      kind: 'apply',
      label: `Solve a problem in ${current.name}`,
      detail: `${left} left in this topic · full derivation, graded on the method`,
      why: 'The topic is learned. This is the step that finds out whether it holds up under a real problem.',
      topicName: current.name,
      subjectName,
      href: `/tasks?topic=${encodeURIComponent(current.name)}`,
      cta: 'Pick a problem',
    }
  }

  // 4. Everything in the subject is done.
  const paper = withContent.find((topic) => stageOf(topic, 'sit').state === 'ready')
  if (paper) {
    return {
      kind: 'sit',
      label: `Sit a ${subjectName} paper`,
      detail: 'Timed, no hints, no coach.',
      why: 'Every topic here is behind you. A timed paper is the only thing left that measures the difference.',
      topicName: null,
      subjectName,
      href: '/mock',
      cta: 'Start a paper',
    }
  }

  return {
    kind: 'done',
    label: `You are through everything in ${subjectName}`,
    detail: 'Notes read, questions answered, cards known, problems solved.',
    why: 'Nothing here is unfinished. More material is what this needs now, not more effort from you.',
    topicName: null,
    subjectName,
    href: '/learn?all=1',
    cta: 'Look at another subject',
  }
}
