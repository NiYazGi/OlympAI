/**
 * The five rungs of a topic, and where a student stands on each.
 *
 * Before this the app had exactly one rung: a graded olympiad problem. That is
 * the right place to finish and a punishing place to start, so the four steps
 * that lead up to it are first-class here — read it, check you followed it,
 * keep it, then use it.
 *
 * Pure, and every figure is passed in already counted, so the ladder can be
 * reasoned about without a database. Nothing is stored: like XP and mastery,
 * the state below is recomputed from the rows that produced it.
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
  /** Distinct questions the student has ever answered correctly, out of all. */
  quiz: { total: number; correct: number; answered: number }
  cards: { total: number; learned: number; due: number; fresh: number }
  tasks: { total: number; solved: number }
  /** Mock papers sat in this topic's subject. */
  mocks: { taken: number; bestPercent: number | null; subjectEligible: boolean }
}

const share = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100)

export function buildLadder(input: LadderInput, t: Translate = identity): LadderStage[] {
  const topic = `/learn/${input.topicSlug}`

  const study: LadderStage = input.lesson
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
        percent: input.lesson.completed ? 100 : input.lesson.opened ? 50 : 0,
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
    href:
      input.tasks.total === 0
        ? null
        : `/tasks?topic=${encodeURIComponent(input.topicName)}`,
  }

  // Nothing above has been finished yet, so "ready when you are" would be
  // technically true and misleading: the paper is open from day one, and
  // sitting it first tells a beginner only that they are a beginner.
  const startedAnything = [study, check, apply].some(
    (stage) => stage.state === 'in-progress' || stage.state === 'done',
  )

  const sit: LadderStage = {
    key: 'sit',
    label: t('Sit a paper'),
    blurb: t('Timed, no hints, no coach — the whole subject at once.'),
    state: !input.mocks.subjectEligible
      ? 'empty'
      : input.mocks.taken > 0
        ? 'done'
        : 'ready',
    detail: !input.mocks.subjectEligible
      ? t('{subject} needs at least three problems before a paper measures anything.', { subject: t(input.subjectName) })
      : input.mocks.taken > 0
        ? t('{taken} papers sat · best {n}%.', { taken: input.mocks.taken, n: input.mocks.bestPercent ?? 0 })
        : startedAnything
          ? t('Ready when you are.')
          : t('Open now, but it measures best once the steps above are behind you.'),
    percent: input.mocks.bestPercent ?? 0,
    href: input.mocks.subjectEligible ? '/mock' : null,
  }

  return [study, check, apply, sit]
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
  const real = stages.filter((stage) => stage.state !== 'empty')
  if (real.length === 0) return 0
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
