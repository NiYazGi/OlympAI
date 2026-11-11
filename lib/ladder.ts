/** Topic actions only: reading, quiz and problem practice.
 * Papers and skill evidence are independent metrics (lib/topic-progress.ts).
 * Pure: all counts are provided by the authenticated query layer.
 */

import { identity, type Translate } from '@/lib/i18n/config'

export type StageKey = 'study' | 'check' | 'recall' | 'apply' | 'sit'

/**
 * `empty` is a real state, not a zero. A topic with no cards written yet says
 * so, rather than showing 0% and implying the student is behind on work that
 * does not exist.
 */
export type StageState = 'empty' | 'ready' | 'in-progress' | 'done'

export type LadderStage = {
  key: StageKey
  label: string
  blurb: string
  state: StageState
  /** One line of plain English under the label. */
  detail: string
  percent: number
  href: string | null
  actions?: { completed: number; total: number }
}

export type LadderInput = {
  topicSlug: string
  topicName: string
  subjectName: string
  lesson: {
    id: string
    blocks: number
    minutes: number | null
    opened: boolean
    completed: boolean
  } | null
  /** Distinct questions whose latest answer is correct, out of all. */
  quiz: { total: number; correct: number; answered: number }
  cards: { total: number; learned: number; due: number; fresh: number }
  tasks: { total: number; solved: number }
  /** Subject paper availability, used only by the subject next-action suggestion. */
  mocks: { taken: number; bestPercent: number | null; subjectEligible: boolean }
}

const share = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100)

export function buildLadder(input: LadderInput, t: Translate = identity): LadderStage[] {
  const topic = `/learn/${input.topicSlug}`

  const study: LadderStage = input.lesson && input.lesson.blocks > 0
    ? {
        key: 'study',
        label: t('Read'),
        blurb: t('Short blocks: the idea, why it works, a worked example, what to remember.'),
        state: input.lesson.completed ? 'done' : input.lesson.opened ? 'in-progress' : 'ready',
        detail: input.lesson.completed
          ? t('Read through.')
          : input.lesson.opened
            ? t('Opened, not finished.')
            : input.lesson.minutes
              ? t('{blocks} blocks · about {minutes} min.', { blocks: input.lesson.blocks, minutes: input.lesson.minutes })
              : t('{blocks} blocks.', { blocks: input.lesson.blocks }),
        percent: input.lesson.completed ? 100 : 0,
        actions: { completed: input.lesson.completed ? 1 : 0, total: 1 },
        href: `${topic}/lesson`,
      }
    : {
        key: 'study',
        label: t('Read'),
        blurb: t('Short blocks: the idea, why it works, a worked example, what to remember.'),
        state: 'empty',
        detail: t('No notes written for this topic yet.'),
        percent: 0,
        href: null,
      }

  const check: LadderStage = {
    key: 'check',
    label: t('Check'),
    blurb: t('A few quick questions, marked the moment you answer.'),
    state:
      input.quiz.total === 0
        ? 'empty'
        : input.quiz.correct >= input.quiz.total
          ? 'done'
          : input.quiz.answered > 0
            ? 'in-progress'
            : 'ready',
    detail:
      input.quiz.total === 0
        ? t('No questions for this topic yet.')
        : input.quiz.answered === 0
          ? t('{total} questions waiting.', { total: input.quiz.total })
          : t('{correct} of {total} answered right.', { correct: input.quiz.correct, total: input.quiz.total }),
    percent: share(input.quiz.correct, input.quiz.total),
    actions: { completed: input.quiz.correct, total: input.quiz.total },
    href: input.quiz.total === 0 ? null : `${topic}/quiz`,
  }

  const apply: LadderStage = {
    key: 'apply',
    label: t('Solve'),
    blurb:
      t('Full derivations, marked against the method. The same library as Problems in the menu, filtered to this topic.'),
    state:
      input.tasks.total === 0
        ? 'empty'
        : input.tasks.solved >= input.tasks.total
          ? 'done'
          : input.tasks.solved > 0
            ? 'in-progress'
            : 'ready',
    detail:
      input.tasks.total === 0
        ? t('No problems in this topic yet.')
        : t('{solved} of {total} problems solved.', { solved: input.tasks.solved, total: input.tasks.total }),
    percent: share(input.tasks.solved, input.tasks.total),
    actions: { completed: input.tasks.solved, total: input.tasks.total },
    href:
      input.tasks.total === 0
        ? null
        : `/tasks?topic=${encodeURIComponent(input.topicName)}`,
  }

  /* Subject papers are deliberately separate from a topic's learning route.
   * An aggregate paper score is not evidence for any individual topic. */
  return [study, check, apply]
}

/**
 * The one thing to do next: the first rung that exists and is not finished.
 *
 * The order is a recommendation, not a lock. Nothing here prevents a student
 * from going straight to the problems — some arrive already knowing the topic,
 * and a trainer that makes them click through a lesson to prove it is a
 * trainer they will resent.
 */
export function nextStep(stages: LadderStage[]): LadderStage | null {
  return stages.find((stage) => stage.state !== 'empty' && stage.state !== 'done') ?? null
}

/** How far through the topic, counting only rungs that have content. */
export function ladderPercent(stages: LadderStage[]): number {
  const real = stages.filter((stage) => stage.key !== 'sit' && stage.state !== 'empty')
  if (real.length === 0) return 0
  const total = real.reduce((sum, stage) => sum + (stage.actions?.total ?? 0), 0)
  if (total > 0) return share(real.reduce((sum, stage) => sum + (stage.actions?.completed ?? 0), 0), total)
  return Math.round(real.reduce((sum, stage) => sum + stage.percent, 0) / real.length)
}

/**
 * Flashcards, which are no longer a rung.
 *
 * They were the third of five steps, which put a deck of definitions between
 * reading a topic and using it, and made the app's daily instruction "review
 * nine cards" more often than "solve something". The deck still schedules
 * itself; it is just not what a session is for, it no longer counts towards a
 * topic's progress, and it is never the next step the app names.
 */
export function buildCardsAside(input: LadderInput, t: Translate): LadderStage {
  const topic = `/learn/${input.topicSlug}`
  return {
    key: 'recall',
    label: t('Memorise'),
    blurb: t('Cards for the terms and facts, spaced out so they stick.'),
    state:
      input.cards.total === 0
        ? 'empty'
        : input.cards.learned >= input.cards.total
          ? 'done'
          : input.cards.fresh < input.cards.total
            ? 'in-progress'
            : 'ready',
    detail:
      input.cards.total === 0
        ? t('No cards for this topic yet.')
        : input.cards.due > 0
          ? t('{due} cards due now.', { due: input.cards.due })
          : input.cards.fresh === input.cards.total
            ? t('{n} new {n|card|cards} to learn.', { n: input.cards.total })
          : t('{learned} of {total} known · nothing due.', { learned: input.cards.learned, total: input.cards.total }),
    percent: share(input.cards.learned, input.cards.total),
    href: input.cards.total === 0 ? null : `${topic}/cards`,
  }
}
