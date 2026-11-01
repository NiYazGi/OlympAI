/**
 * The four rungs of a topic, and where a student stands on each.
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

import type { Dictionary } from '@/lib/i18n/dictionaries'

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
  cards: { total: number; learned: number; due: number }
  tasks: { total: number; solved: number }
  /** Mock papers sat in this topic's subject. */
  mocks: { taken: number; bestPercent: number | null; subjectEligible: boolean }
}

const share = (done: number, total: number) =>
  total === 0 ? 0 : Math.round((done / total) * 100)

export function buildLadder(input: LadderInput, t: Dictionary): LadderStage[] {
  const topic = `/learn/${input.topicSlug}`
  const copy = t.ladder

  const study: LadderStage = input.lesson
    ? {
        key: 'study',
        label: copy.study.label,
        blurb: copy.study.blurb,
        state: input.lesson.completed ? 'done' : input.lesson.opened ? 'in-progress' : 'ready',
        detail: input.lesson.completed
          ? copy.study.readThrough
          : input.lesson.opened
            ? copy.study.opened
            : copy.study.waiting(input.lesson.blocks, input.lesson.minutes),
        percent: input.lesson.completed ? 100 : input.lesson.opened ? 50 : 0,
        href: `${topic}/lesson`,
      }
    : {
        key: 'study',
        label: copy.study.label,
        blurb: copy.study.blurb,
        state: 'empty',
        detail: copy.study.empty,
        percent: 0,
        href: null,
      }

  const check: LadderStage = {
    key: 'check',
    label: copy.check.label,
    blurb: copy.check.blurb,
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
        ? copy.check.empty
        : input.quiz.answered === 0
          ? copy.check.waiting(input.quiz.total)
          : copy.check.progress(input.quiz.correct, input.quiz.total),
    percent: share(input.quiz.correct, input.quiz.total),
    href: input.quiz.total === 0 ? null : `${topic}/quiz`,
  }

  const apply: LadderStage = {
    key: 'apply',
    label: copy.apply.label,
    blurb: copy.apply.blurb,
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
        ? copy.apply.empty
        : copy.apply.progress(input.tasks.solved, input.tasks.total),
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
    label: copy.sit.label,
    blurb: copy.sit.blurb,
    state: !input.mocks.subjectEligible
      ? 'empty'
      : input.mocks.taken > 0
        ? 'done'
        : 'ready',
    detail: !input.mocks.subjectEligible
      ? copy.sit.ineligible(t.subjects[input.subjectName] ?? input.subjectName)
      : input.mocks.taken > 0
        ? copy.sit.taken(input.mocks.taken, input.mocks.bestPercent ?? 0)
        : startedAnything
          ? copy.sit.ready
          : copy.sit.early,
    percent: input.mocks.bestPercent ?? 0,
    href: input.mocks.subjectEligible ? '/mock' : null,
  }

  return [study, check, apply, sit]
}

/**
 * Flashcards, which are no longer a rung.
 *
 * They were the third of five steps, which put a deck of definitions between
 * reading a topic and using it, and made the app's daily instruction "review
 * nine cards" more often than "solve something". Spacing is a real technique
 * and the deck still schedules itself — it is just not what a session is for,
 * and it no longer counts towards a topic's progress.
 */
export function buildCardsAside(input: LadderInput, t: Dictionary): LadderStage {
  const topic = `/learn/${input.topicSlug}`
  const copy = t.ladder.cards
  return {
    key: 'recall',
    label: copy.label,
    blurb: copy.blurb,
    state:
      input.cards.total === 0
        ? 'empty'
        : input.cards.learned >= input.cards.total
          ? 'done'
          : input.cards.learned > 0 || input.cards.due < input.cards.total
            ? 'in-progress'
            : 'ready',
    detail:
      input.cards.total === 0
        ? copy.empty
        : input.cards.due > 0
          ? copy.due(input.cards.due)
          : copy.known(input.cards.learned, input.cards.total),
    percent: share(input.cards.learned, input.cards.total),
    href: input.cards.total === 0 ? null : `${topic}/cards`,
  }
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
