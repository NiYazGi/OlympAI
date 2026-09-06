import type { CatalogueTask } from '@/lib/types'

/**
 * Composing and scoring a mock paper.
 *
 * Pure, so the difficulty spread and the level bands can be checked without a
 * database or a model call.
 */

/** Difficulty spread of a paper, easiest first. Mirrors a real olympiad set. */
const SHAPE = [2, 3, 3, 4, 5] as const

export type MockBlueprint = {
  taskIds: string[]
  durationMinutes: number
  difficulties: number[]
}

const MIN_TASKS = 3
const FALLBACK_MINUTES = 20
/** Real papers give more room than the practice estimate. */
const TIME_MULTIPLIER = 1.25

/**
 * Picks a paper from what the subject has.
 *
 * Unsolved tasks come first — a test made of problems you have already answered
 * measures recall, not level — but solved ones fill the gaps rather than
 * shortening the paper below the point where the result means anything.
 */
export function composeMock(tasks: CatalogueTask[]): MockBlueprint | null {
  if (tasks.length < MIN_TASKS) return null

  const pool = [...tasks].sort((a, b) => {
    if (a.solved !== b.solved) return a.solved ? 1 : -1
    return a.difficulty - b.difficulty
  })

  const used = new Set<string>()
  const chosen: CatalogueTask[] = []

  for (const wanted of SHAPE) {
    // Closest difficulty still available, preferring unsolved.
    const candidate = pool
      .filter((task) => !used.has(task.id))
      .sort((a, b) => {
        const byGap = Math.abs(a.difficulty - wanted) - Math.abs(b.difficulty - wanted)
        if (byGap !== 0) return byGap
        return a.solved === b.solved ? 0 : a.solved ? 1 : -1
      })[0]
    if (!candidate) break
    used.add(candidate.id)
    chosen.push(candidate)
  }

  if (chosen.length < MIN_TASKS) return null

  chosen.sort((a, b) => a.difficulty - b.difficulty)
  const minutes = chosen.reduce(
    (sum, task) => sum + (task.estimatedMinutes ?? FALLBACK_MINUTES),
    0,
  )

  return {
    taskIds: chosen.map((task) => task.id),
    durationMinutes: Math.max(15, Math.round((minutes * TIME_MULTIPLIER) / 5) * 5),
    difficulties: chosen.map((task) => task.difficulty),
  }
}

export type MockOutcome = {
  scorePercent: number
  level: string
  headline: string
  solved: number
  total: number
}

/**
 * Scores the paper and names a level.
 *
 * Weighted by difficulty: a five-star problem answered well says more about
 * readiness than three two-star ones. The bands reuse the wording the profile
 * already offers, so a measured level can replace the self-reported one.
 */
export function scoreMock(
  results: { difficulty: number; score: number; isCorrect: boolean }[],
): MockOutcome {
  const total = results.length
  if (total === 0) {
    return { scorePercent: 0, level: 'Getting started', headline: 'Nothing to score.', solved: 0, total: 0 }
  }

  const weight = results.reduce((sum, item) => sum + item.difficulty, 0)
  const earned = results.reduce((sum, item) => sum + item.difficulty * (item.score / 100), 0)
  const scorePercent = Math.round((earned / weight) * 100)
  const solved = results.filter((item) => item.isCorrect).length

  const { level, headline } =
    scorePercent >= 80
      ? {
          level: 'Competition ready',
          headline: 'Strong across the range, including the hardest problem on the paper.',
        }
      : scorePercent >= 55
        ? {
            level: 'Building momentum',
            headline: 'Solid on the routine work; the harder end is where the gap is.',
          }
        : scorePercent >= 25
          ? {
              level: 'Building momentum',
              headline: 'The method is there in places. Consistency is the next thing to build.',
            }
          : {
              level: 'Getting started',
              headline: 'Early days. Work through the path in order rather than jumping ahead.',
            }

  return { scorePercent, level, headline, solved, total }
}
