/**
 * The day, scored on five axes that can be traded against each other.
 *
 * The rest of the app measures output — problems solved, questions answered,
 * papers sat. That is half of a day. The other half is what the day was made
 * of: what was read, what was attempted, how the head was, how the night went,
 * and how much of the day was never yours to begin with.
 *
 * Five axes, five points each, and the bar is more than fifteen out of
 * twenty-five. That is deliberately reachable in several ways. A student four
 * points short can solve another problem, or they can go to bed — and seeing
 * those two priced the same is the whole reason the diagram exists. It is not
 * a scoreboard; it is a way of noticing that the cheapest four points tonight
 * are usually not the ones you were about to spend three hours on.
 *
 * Pure, and every figure is passed in already measured. Nothing here reads a
 * database, so the rules can be argued with, and changed, on their own.
 */
import type { Dictionary } from '@/lib/i18n/dictionaries'

/** Where in the run-up the student is. Everything below is scored differently. */
export type Phase = 'base' | 'crunch' | 'taper'

/** The last fortnight, when the load goes up and the bedtime starts to matter. */
export const CRUNCH_DAYS = 14
/** The last two days, when the right move is to stop. */
export const TAPER_DAYS = 2
export const LIGHTS_OUT = '22:30'

export const AXIS_MAX = 5
export const DAY_MAX = 25
/** More than fifteen — so the bar is cleared at sixteen, not at fifteen. */
export const DAY_TARGET = 15

/** The label and the rule for a phase, in the reader's language. */
export function phaseCopy(phase: Phase, t: Dictionary): { label: string; rule: string } {
  const copy = t.day.phase
  if (phase === 'crunch') return { label: copy.crunch.label, rule: copy.crunch.rule(LIGHTS_OUT) }
  return phase === 'taper' ? copy.taper : copy.base
}

export type DayInputs = {
  /** Minutes on theory: reading, lectures, notes. */
  theoryMinutes: number
  /** Minutes attempting problems, wherever they were attempted. */
  solvingMinutes: number
  /** How the head was, 1–5. Zero means the question was not answered. */
  mental: number
  /** Hours slept last night, as the student reports them. */
  sleepHours: number
  /** In bed by 22:30. */
  lightsOut: boolean
  /** Minutes school and everything else took. Scored in reverse. */
  loadMinutes: number
  /**
   * Whether the day was reported at all.
   *
   * Zero is a real answer on every axis but one: nought minutes taken by
   * school is an excellent day, and a day nobody filled in is not. Without
   * this flag an untouched day scored five out of five for being free, which
   * is the app congratulating someone for saying nothing.
   */
  reported: boolean
}

export const EMPTY_DAY: DayInputs = {
  theoryMinutes: 0,
  solvingMinutes: 0,
  mental: 0,
  sleepHours: 0,
  lightsOut: false,
  loadMinutes: 0,
  reported: false,
}

export type AxisKey = 'theory' | 'solving' | 'mental' | 'sleep' | 'load'

export type Axis = {
  key: AxisKey
  label: string
  score: number
  /** What was recorded, in one phrase. */
  detail: string
  /** What the missing points would cost. Null once the axis is full. */
  gap: string | null
}

export type DayScore = {
  phase: Phase
  axes: Axis[]
  total: number
  /** True once the total is above the bar, not level with it. */
  met: boolean
  /** Points still needed. Zero once the bar is cleared. */
  short: number
  /** Where those points are cheapest tonight, or null when nothing is left. */
  cheapest: Axis | null
}

export function phaseFor(daysLeft: number | null): Phase {
  if (daysLeft === null) return 'base'
  if (daysLeft <= TAPER_DAYS) return 'taper'
  if (daysLeft <= CRUNCH_DAYS) return 'crunch'
  return 'base'
}

/** One point per threshold passed, so five ascending thresholds give 0–5. */
function band(value: number, thresholds: readonly number[]): number {
  return thresholds.filter((threshold) => value >= threshold).length
}

/** The same, for a figure that should be small: one point per ceiling stayed under. */
function reverseBand(value: number, ceilings: readonly number[]): number {
  return ceilings.filter((ceiling) => value <= ceiling).length
}

const hours = (minutes: number, t: Dictionary) => {
  if (minutes < 60) return t.common.minutes(minutes)
  const whole = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? t.common.hours(whole) : `${t.common.hours(whole)} ${t.common.minutes(rest)}`
}

/**
 * How much of each kind of work a full day holds, by phase.
 *
 * Two to three hours in the base phase, ten to twelve in the last fortnight —
 * split between reading and solving in roughly one to two, because the
 * problems are where the hours have to end up. The taper wants neither.
 */
const THEORY: Record<Phase, readonly number[]> = {
  base: [10, 20, 30, 45, 60],
  crunch: [45, 90, 135, 180, 240],
  taper: [],
}
const SOLVING: Record<Phase, readonly number[]> = {
  base: [20, 40, 60, 90, 120],
  crunch: [90, 180, 300, 420, 540],
  taper: [],
}
/** Minutes the rest of life may take before it starts costing points. */
const LOAD_CEILINGS: Record<Phase, readonly number[]> = {
  base: [480, 390, 300, 210, 120],
  crunch: [300, 240, 180, 120, 60],
  taper: [480, 390, 300, 210, 120],
}
/** In the taper both kinds of work are scored for being absent. */
const RESTING: readonly number[] = [240, 180, 120, 60, 30]

export function hoursTarget(phase: Phase): number {
  return (THEORY[phase][4] ?? 0) + (SOLVING[phase][4] ?? 0)
}

function theoryAxis(input: DayInputs, phase: Phase, t: Dictionary): Axis {
  const copy = t.day
  if (phase === 'taper') {
    const score = reverseBand(input.theoryMinutes, RESTING)
    return {
      key: 'theory',
      label: copy.axes.theory,
      score,
      detail: input.theoryMinutes === 0 ? copy.detail.restingRight : hours(input.theoryMinutes, t),
      gap: score === AXIS_MAX ? null : copy.gap.stop(AXIS_MAX - score),
    }
  }
  const thresholds = THEORY[phase]
  const score = band(input.theoryMinutes, thresholds)
  const missing = AXIS_MAX - score
  return {
    key: 'theory',
    label: copy.axes.theory,
    score,
    detail: input.theoryMinutes === 0 ? copy.detail.notStarted : hours(input.theoryMinutes, t),
    gap:
      missing === 0
        ? null
        : copy.gap.more(hours(Math.max(1, thresholds[4]! - input.theoryMinutes), t), missing),
  }
}

/**
 * Solving, which is the one axis the app can partly see for itself.
 *
 * `graded` is the XP earned today from work done inside the app. Most solving
 * happens on paper, so the student's own figure is what counts — but the app
 * will not score someone lower than the work it watched them do, which is what
 * a floor rather than an override means.
 */
function solvingAxis(
  input: DayInputs,
  phase: Phase,
  graded: { today: number; goal: number },
  t: Dictionary,
): Axis {
  const copy = t.day
  if (phase === 'taper') {
    const score = reverseBand(input.solvingMinutes, RESTING)
    return {
      key: 'solving',
      label: copy.axes.solving,
      score,
      detail: input.solvingMinutes === 0 ? copy.detail.restingRight : hours(input.solvingMinutes, t),
      gap: score === AXIS_MAX ? null : copy.gap.leaveIt,
    }
  }
  const thresholds = SOLVING[phase]
  const reported = band(input.solvingMinutes, thresholds)
  const seen = graded.goal > 0 ? band(graded.today / graded.goal, [0.15, 0.35, 0.6, 0.8, 1]) : 0
  const score = Math.max(reported, seen)
  const missing = AXIS_MAX - score
  return {
    key: 'solving',
    label: copy.axes.solving,
    score,
    detail:
      input.solvingMinutes === 0 && graded.today === 0
        ? copy.detail.notStarted
        : input.solvingMinutes > 0
          ? hours(input.solvingMinutes, t)
          : copy.detail.xpOf(graded.today, graded.goal),
    gap:
      missing === 0
        ? null
        : copy.gap.more(hours(Math.max(1, thresholds[4]! - input.solvingMinutes), t), missing),
  }
}

/**
 * The head, which nothing else in the app can see at all.
 *
 * Self-rated one to five, and zero when the question has not been answered —
 * a day nobody reported is not a day that went badly, and scoring it as one
 * would teach people to stop reporting.
 */
function mentalAxis(input: DayInputs, t: Dictionary): Axis {
  const copy = t.day
  return {
    key: 'mental',
    label: copy.axes.mental,
    score: Math.min(AXIS_MAX, Math.max(0, input.mental)),
    detail: input.mental === 0 ? copy.detail.notRecorded : copy.detail.mental(input.mental),
    gap: input.mental >= AXIS_MAX ? null : copy.gap.mental,
  }
}

function sleepAxis(input: DayInputs, phase: Phase, t: Dictionary): Axis {
  const copy = t.day
  // Eight hours is the fifth point, and from two weeks out the fifth point also
  // needs the bedtime: sleeping eight hours starting at two in the morning
  // trains you to be asleep at the hour the paper starts.
  const earned = band(input.sleepHours, [5, 6, 7, 7.5, 8])
  const capped = phase === 'base' || input.lightsOut ? earned : Math.min(earned, 4)
  const missing = AXIS_MAX - capped

  return {
    key: 'sleep',
    label: copy.axes.sleep,
    score: capped,
    detail:
      input.sleepHours === 0
        ? copy.detail.notRecorded
        : copy.detail.sleepHours(input.sleepHours, input.lightsOut, LIGHTS_OUT),
    gap:
      missing === 0
        ? null
        : capped === 4 && !input.lightsOut && phase !== 'base'
          ? copy.gap.lightsOut(LIGHTS_OUT)
          : copy.gap.sleep(missing),
  }
}

/**
 * Everything that was not the olympiad, counted downwards.
 *
 * School, tutors, a job, a side project. This is the axis that says an
 * olympiad wants the whole of someone's attention, and it says it as a
 * measurement rather than a judgement: not "was the day split" but "how much
 * was taken". Nothing here is the student's fault — a school day is a school
 * day — which is exactly why it belongs on the diagram. A week that keeps
 * scoring two here is a week that needs a conversation, not more effort.
 */
function loadAxis(input: DayInputs, phase: Phase, t: Dictionary): Axis {
  const copy = t.day
  if (!input.reported) {
    return {
      key: 'load',
      label: copy.axes.load,
      score: 0,
      detail: copy.detail.notRecorded,
      gap: copy.gap.load(AXIS_MAX),
    }
  }
  const score = reverseBand(input.loadMinutes, LOAD_CEILINGS[phase])
  const missing = AXIS_MAX - score
  return {
    key: 'load',
    label: copy.axes.load,
    score,
    detail: input.loadMinutes === 0 ? copy.detail.loadNone : hours(input.loadMinutes, t),
    gap: missing === 0 ? null : copy.gap.load(missing),
  }
}

/**
 * Which missing points to suggest first.
 *
 * Ordered by what they cost the student tonight, not by how many they are
 * worth: an early night is cheaper than three more hours of problems, and the
 * suggestion is only useful if it is the one they might actually take. Load
 * comes last because it is mostly not theirs to change today.
 */
const EFFORT: AxisKey[] = ['mental', 'sleep', 'theory', 'solving', 'load']

/**
 * The cheapest axis that is worth suggesting.
 *
 * Effort order first, but a single missing point is not advice when nine are
 * missing: being told to go for a walk while eight points short reads as the
 * app not having looked. So axes that would move the total by three or more
 * are considered first, in the same cost order, and the plain cost order is
 * the fallback once nothing large is left.
 */
function cheapestGap(axes: Axis[], byKey: Map<AxisKey, Axis>): Axis | null {
  const ordered = EFFORT.map((key) => byKey.get(key)!).filter((axis) => axis.gap !== null)
  return ordered.find((axis) => AXIS_MAX - axis.score >= 3) ?? ordered[0] ?? null
}

export function scoreDay(
  input: DayInputs,
  phase: Phase,
  graded: { today: number; goal: number },
  t: Dictionary,
): DayScore {
  const axes: Axis[] = [
    theoryAxis(input, phase, t),
    solvingAxis(input, phase, graded, t),
    mentalAxis(input, t),
    sleepAxis(input, phase, t),
    loadAxis(input, phase, t),
  ]

  const total = axes.reduce((sum, axis) => sum + axis.score, 0)
  const met = total > DAY_TARGET
  const byKey = new Map(axes.map((axis) => [axis.key, axis]))

  return {
    phase,
    axes,
    total,
    met,
    short: met ? 0 : DAY_TARGET + 1 - total,
    cheapest: cheapestGap(axes, byKey),
  }
}
