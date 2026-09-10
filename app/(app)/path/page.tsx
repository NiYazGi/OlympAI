import { redirect } from 'next/navigation'

/**
 * Merged into /learn.
 *
 * The two pages were the same journey ordered twice — /path by task difficulty,
 * /learn by topic — and a student had to work out which one was the plan. The
 * goal panel, the schedule and the week rhythm all live on /learn now, so this
 * is the fourth route to redirect rather than the second plan to maintain.
 */
export default function PathPage() {
  redirect('/learn')
}
