/**
 * When a card comes back.
 *
 * Derived from the review log, never stored. The same reasoning as XP: a
 * scheduler column would be a second copy of a fact the reviews already
 * contain, and the two would eventually disagree. Replaying a handful of rows
 * costs nothing and means the intervals below can be changed without a
 * migration and without every existing deck being wrong.
 *
 * Leitner boxes rather than SM-2. SM-2 tunes an ease factor per card from
 * self-reported difficulty, which needs a long history before it says anything;
 * with a deck this size the honest version is a ladder of fixed intervals.
 */

export type Rating = 0 | 1 | 2 | 3

/** 0 forgot · 1 hard · 2 good · 3 easy — the four buttons under a card. */
export const RATINGS: { value: Rating; label: string; hint: string }[] = [
  { value: 0, label: 'Forgot', hint: 'Back to the start of the ladder.' },
  { value: 1, label: 'Hard', hint: 'Drops a step.' },
  { value: 2, label: 'Good', hint: 'Up a step.' },
  { value: 3, label: 'Easy', hint: 'Up two.' },
]

/**
 * Days until the next sighting, by box. Box 0 is "again in this session".
 *
 * The jumps widen because forgetting slows down: the gap that is useful right
 * after learning something is useless a month later.
 */
const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const
const MAX_BOX = INTERVAL_DAYS.length - 1

const DAY_MS = 86_400_000

export type Review = { rating: Rating; createdAt: string }

export type CardState = {
  /** 0-5. Higher means longer between sightings. */
  box: number
  reviews: number
  lastReviewedAt: string | null
  /** Null for a card never seen, which is due immediately. */
  dueAt: string | null
  /** Nothing has been reviewed yet, so it is new rather than overdue. */
  isNew: boolean
}

function nextBox(box: number, rating: Rating): number {
  // Forgetting resets. It is the one rating that has to cost the whole ladder:
  // a card you cannot recall has not been learned, however long ago it was
  // last answered correctly.
  if (rating === 0) return 0
  if (rating === 1) return Math.max(0, box - 1)
  return Math.min(MAX_BOX, box + (rating === 3 ? 2 : 1))
}

/** Replays a card's reviews oldest-first and says where it stands. */
export function cardState(reviews: Review[]): CardState {
  if (reviews.length === 0) {
    return { box: 0, reviews: 0, lastReviewedAt: null, dueAt: null, isNew: true }
  }

  const ordered = [...reviews].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  let box = 0
  for (const review of ordered) box = nextBox(box, review.rating)

  const last = ordered[ordered.length - 1].createdAt
  const dueAt = new Date(new Date(last).getTime() + INTERVAL_DAYS[box] * DAY_MS).toISOString()

  return { box, reviews: ordered.length, lastReviewedAt: last, dueAt, isNew: false }
}

export function isDue(state: CardState, now = new Date()): boolean {
  if (state.isNew || !state.dueAt) return true
  return new Date(state.dueAt).getTime() <= now.getTime()
}

/** What the buttons promise, so the choice is not a guess. */
export function intervalAfter(state: CardState, rating: Rating): string {
  const days = INTERVAL_DAYS[nextBox(state.box, rating)]
  if (days === 0) return 'again today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

/**
 * A card counts as learned once it has survived two boxes — roughly, recalled
 * correctly on two separate days. Used for the progress figure on the ladder,
 * where "how many do I actually know" is the question being asked.
 */
export const LEARNED_BOX = 2
export function isLearned(state: CardState): boolean {
  return state.box >= LEARNED_BOX
}

export type DueCard<T> = { card: T; state: CardState }

/**
 * Orders a session: most overdue first, then new cards, then the rest.
 *
 * New cards go after overdue ones deliberately. Meeting the backlog first is
 * what keeps a deck from growing faster than it is learned.
 */
export function orderForReview<T>(
  entries: DueCard<T>[],
  now = new Date(),
): DueCard<T>[] {
  const overdueBy = (state: CardState) =>
    state.dueAt ? now.getTime() - new Date(state.dueAt).getTime() : 0

  return [...entries].sort((a, b) => {
    const aDue = isDue(a.state, now)
    const bDue = isDue(b.state, now)
    if (aDue !== bDue) return aDue ? -1 : 1
    if (a.state.isNew !== b.state.isNew) return a.state.isNew ? 1 : -1
    return overdueBy(b.state) - overdueBy(a.state)
  })
}
